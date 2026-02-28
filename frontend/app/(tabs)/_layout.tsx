import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { COLORS, FONTS } from '@/utils/constants';
import AppHeader from '@/components/AppHeader';
import { useUser } from '@/context/UserContext';

export default function TabsLayout() {
  const { isAdmin } = useUser();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.BACKGROUND }}>
      <AppHeader />
      <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.BACKGROUND,
          borderTopWidth: 1,
          borderTopColor: COLORS.BORDER,
          ...(isAdmin ? {} : { height: 0, overflow: 'hidden', borderTopWidth: 0 }),
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_TERTIARY,
        tabBarLabelStyle: {
          fontFamily: FONTS.INTER,
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Upload',
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
        }}
      />
    </Tabs>
    </View>
  );
}
