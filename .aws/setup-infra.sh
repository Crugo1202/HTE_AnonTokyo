#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
APP_NAME="hte-anontokyo"
LAMBDA_FUNCTION_NAME="hte-anontokyo-api"
LAMBDA_ROLE_NAME="hte-anontokyo-lambda-role"
DIST_COMMENT="hte-anontokyo-lambda-cdn"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${LAMBDA_ROLE_NAME}"
LOG_GROUP="/aws/lambda/${LAMBDA_FUNCTION_NAME}"

echo "=== HTE AnonTokyo Lambda + CloudFront Setup ==="
echo "Region: $REGION | Account: $ACCOUNT_ID"
echo ""

# ── 1. IAM role for Lambda ──────────────────────────────────────────────────
echo "1) Ensuring IAM role exists: ${LAMBDA_ROLE_NAME}"
if ! aws iam get-role --role-name "$LAMBDA_ROLE_NAME" >/dev/null 2>&1; then
  aws iam create-role \
    --role-name "$LAMBDA_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' >/dev/null
fi

aws iam attach-role-policy \
  --role-name "$LAMBDA_ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" \
  >/dev/null || true

# Optional SSM read access (if you later want to load secrets from SSM in code)
aws iam put-role-policy \
  --role-name "$LAMBDA_ROLE_NAME" \
  --policy-name "HTEReadSSM" \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [\"ssm:GetParameter\", \"ssm:GetParameters\"],
      \"Resource\": \"arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter/hte/*\"
    }]
  }" >/dev/null
echo "   Role ready: $ROLE_ARN"

# ── 2. Ensure CloudWatch log group exists ────────────────────────────────────
echo "2) Ensuring log group exists: ${LOG_GROUP}"
if ! aws logs describe-log-groups \
  --region "$REGION" \
  --log-group-name-prefix "$LOG_GROUP" \
  --query "logGroups[?logGroupName=='$LOG_GROUP'] | length(@)" \
  --output text | grep -q '^1$'; then
  aws logs create-log-group --log-group-name "$LOG_GROUP" --region "$REGION" >/dev/null
fi

# ── 3. Create bootstrap Lambda if missing ────────────────────────────────────
echo "3) Ensuring Lambda function exists: ${LAMBDA_FUNCTION_NAME}"
if ! aws lambda get-function --function-name "$LAMBDA_FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  TMP_DIR="$(mktemp -d)"
  cat > "${TMP_DIR}/lambda_function.py" <<'PY'
def lambda_handler(event, context):
    return {"statusCode": 200, "body": "Bootstrap OK. Deploy app bundle via GitHub Actions."}
PY
  (cd "$TMP_DIR" && zip -q function.zip lambda_function.py)
  aws lambda create-function \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --runtime python3.12 \
    --handler lambda_function.lambda_handler \
    --role "$ROLE_ARN" \
    --timeout 900 \
    --memory-size 2048 \
    --zip-file "fileb://${TMP_DIR}/function.zip" \
    --region "$REGION" >/dev/null
  rm -rf "$TMP_DIR"
fi
echo "   Lambda ready: ${LAMBDA_FUNCTION_NAME}"

# ── 4. Configure Lambda env vars from SSM if available ──────────────────────
echo "4) Syncing Lambda environment vars from SSM (if present)"
get_param() {
  local name="$1"
  aws ssm get-parameter \
    --name "$name" \
    --with-decryption \
    --region "$REGION" \
    --query Parameter.Value \
    --output text 2>/dev/null || true
}

OPENAI_API_KEY="$(get_param /hte/OPENAI_API_KEY)"
GEMINI_API_KEY="$(get_param /hte/GEMINI_API_KEY)"
MINIMAX_API_KEY="$(get_param /hte/MINIMAX_API_KEY)"

ENV_FILE="$(mktemp)"
OPENAI_API_KEY="$OPENAI_API_KEY" \
GEMINI_API_KEY="$GEMINI_API_KEY" \
MINIMAX_API_KEY="$MINIMAX_API_KEY" \
python - <<'PY' > "$ENV_FILE"
import json
import os

payload = {
    "Variables": {
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY", ""),
        "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY", ""),
        "MINIMAX_API_KEY": os.getenv("MINIMAX_API_KEY", ""),
        "MAX_UPLOAD_BYTES": "524288000",
    }
}
print(json.dumps(payload))
PY

aws lambda update-function-configuration \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --region "$REGION" \
  --environment "file://${ENV_FILE}" \
  >/dev/null
rm -f "$ENV_FILE"

# ── 5. Function URL (public) ─────────────────────────────────────────────────
echo "5) Ensuring Lambda Function URL exists"
if ! aws lambda get-function-url-config \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --region "$REGION" >/dev/null 2>&1; then
  aws lambda create-function-url-config \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --auth-type NONE \
    --cors "AllowOrigins=['*'],AllowMethods=['*'],AllowHeaders=['*']" \
    --region "$REGION" >/dev/null
fi

aws lambda add-permission \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --statement-id "FunctionURLAllowPublic" \
  --action "lambda:InvokeFunctionUrl" \
  --principal "*" \
  --function-url-auth-type NONE \
  --region "$REGION" >/dev/null 2>&1 || true

FUNCTION_URL="$(aws lambda get-function-url-config \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --region "$REGION" \
  --query FunctionUrl \
  --output text)"
FUNCTION_HOST="$(echo "$FUNCTION_URL" | sed -E 's#https://([^/]+)/?#\1#')"
echo "   Function URL: $FUNCTION_URL"

# ── 6. CloudFront distribution ───────────────────────────────────────────────
echo "6) Ensuring CloudFront distribution exists"
DIST_ID="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='${DIST_COMMENT}'].Id | [0]" \
  --output text)"

if [ "$DIST_ID" = "None" ] || [ -z "$DIST_ID" ]; then
  CFG_FILE="$(mktemp)"
  cat > "$CFG_FILE" <<JSON
{
  "CallerReference": "${APP_NAME}-$(date +%s)",
  "Comment": "${DIST_COMMENT}",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "lambda-url-origin",
      "DomainName": "${FUNCTION_HOST}",
      "OriginPath": "",
      "CustomHeaders": {"Quantity": 0},
      "CustomOriginConfig": {
        "HTTPPort": 80,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "https-only",
        "OriginSslProtocols": {
          "Quantity": 1,
          "Items": ["TLSv1.2"]
        },
        "OriginReadTimeout": 30,
        "OriginKeepaliveTimeout": 5
      }
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "lambda-url-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET","HEAD","OPTIONS","PUT","PATCH","POST","DELETE"],
      "CachedMethods": {
        "Quantity": 3,
        "Items": ["GET","HEAD","OPTIONS"]
      }
    },
    "Compress": true,
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  },
  "PriceClass": "PriceClass_100"
}
JSON
  DIST_ID="$(aws cloudfront create-distribution \
    --distribution-config "file://${CFG_FILE}" \
    --query 'Distribution.Id' \
    --output text)"
  rm -f "$CFG_FILE"
fi

CF_DOMAIN="$(aws cloudfront get-distribution \
  --id "$DIST_ID" \
  --query 'Distribution.DomainName' \
  --output text)"

echo ""
echo "=== Setup complete ==="
echo "Lambda Function:            ${LAMBDA_FUNCTION_NAME}"
echo "Lambda Function URL:        ${FUNCTION_URL}"
echo "CloudFront Distribution ID: ${DIST_ID}"
echo "CloudFront Domain:          https://${CF_DOMAIN}"
echo ""
echo "GitHub secrets to set:"
echo "  AWS_ACCESS_KEY_ID"
echo "  AWS_SECRET_ACCESS_KEY"
echo "  CLOUDFRONT_DISTRIBUTION_ID=${DIST_ID}"
