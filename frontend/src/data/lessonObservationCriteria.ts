/**
 * Lesson observation criteria for the ratings table.
 * Remarks column shows descriptor text; score (1–4) is computed per analysis (mock).
 */

export interface LessonObservationCriterion {
  category: string
  criterion: string
  remarks: string
  key: string
}

export const LESSON_OBSERVATION_CRITERIA: LessonObservationCriterion[] = [
  {
    category: 'Teaching organization',
    criterion: 'Learning objective',
    key: 'learning_objective',
    remarks: 'Clear objectives; suited to learners\' needs / ability levels;',
  },
  {
    category: 'Teaching organization',
    criterion: 'Organization of learning activities/ tasks',
    key: 'org_learning_activities',
    remarks: 'Activities / tasks are well connected; Smooth transitions; appropriate pace, encouraging self-learning; developing generic skills',
  },
  {
    category: 'Teaching organization',
    criterion: 'Professional knowledge',
    key: 'professional_knowledge',
    remarks: 'Good content knowledge; clear concept; appropriate teaching strategies',
  },
  {
    category: 'Teaching organization',
    criterion: 'Attitude',
    key: 'attitude',
    remarks: 'Friendly, approachable; responsible; supportive; open-minded',
  },
  {
    category: 'Pre-lesson preparation',
    criterion: 'Content and resources',
    key: 'content_resources',
    remarks: 'Appropriate content and lesson preparation resources given to students (which can achieve teaching objective)',
  },
  {
    category: 'Pre-lesson preparation',
    criterion: 'Students\' attitude towards pre-lesson works',
    key: 'students_attitude_prelesson',
    remarks: 'Follow instructions to complete the pre-lesson preparation tasks',
  },
  {
    category: 'Pre-lesson preparation',
    criterion: 'Use of pre-lesson preparation materials',
    key: 'use_prelesson_materials',
    remarks: 'Teacher effectively uses the pre-lesson preparation materials to facilitate students\' understanding of the content',
  },
  {
    category: 'Pre-lesson preparation',
    criterion: 'Acquisition of lesson objectives',
    key: 'acquisition_lesson_objectives',
    remarks: 'Pre-lesson materials contributes to students\' understanding of the lesson content',
  },
  {
    category: 'Communication skills in teaching',
    criterion: 'Presentation',
    key: 'presentation',
    remarks: 'Clear; concise; systematic; clear focus',
  },
  {
    category: 'Communication skills in teaching',
    criterion: 'Questioning techniques',
    key: 'questioning_techniques',
    remarks: 'Check understanding of knowledge; Sustain motivation; encourage high-order thinking; encourage inquiry learning; enough waiting time',
  },
  {
    category: 'Communication skills in teaching',
    criterion: 'Feedback',
    key: 'feedback',
    remarks: 'Approving; rewarding; encouraging; specifying attainment; specifying improvement; timely; following up students\' respond',
  },
  {
    category: 'Class interaction with students',
    criterion: 'Learning atmosphere',
    key: 'learning_atmosphere',
    remarks: 'Good teacher-student rapport; supportive; lively; challenging;',
  },
  {
    category: 'Class interaction with students',
    criterion: 'Catering for learner difference',
    key: 'catering_learner_difference',
    remarks: 'Suitably adjusts content; breaks down content into small parts; monitors students\' progress; adjusts teaching method / tempo; provides suitable individual support; opportunities for different learners to participate',
  },
  {
    category: 'Learning attitude and performance',
    criterion: 'Attitude towards learning',
    key: 'attitude_towards_learning',
    remarks: 'Attentive; eager to learn; showing confidence; showing initiative',
  },
  {
    category: 'Learning attitude and performance',
    criterion: 'Students\' works',
    key: 'students_works',
    remarks: 'Appropriate sharing; appropriate response; good questions raised; able to reflect their understanding of the lesson',
  },
  {
    category: 'Learning strategy',
    criterion: 'Group / pair interaction',
    key: 'group_pair_interaction',
    remarks: 'Students are motivated / highly motivated to interact as a group; *',
  },
  {
    category: 'Learning strategy',
    criterion: 'Frequency of interaction',
    key: 'frequency_of_interaction',
    remarks: 'Teacher-student interactions are frequent (4) / average (3) / not enough (2) / none (1) *\nStudent-student interactions are frequent (4) / average (3) / not enough (2) / none (1) *',
  },
]
