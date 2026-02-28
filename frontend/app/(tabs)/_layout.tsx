import { Tabs } from 'expo-router';
import { COLORS, FONTS } from '@/utils/constants';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.BACKGROUND,
          borderTopWidth: 1,
          borderTopColor: COLORS.BORDER,
        },
        tabBarActiveTintColor: COLORS.TEXT,
        tabBarInactiveTintColor: COLORS.PLACEHOLDER,
        tabBarLabelStyle: {
          fontFamily: FONTS.INTER,
          fontSize: 12,
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
  );
}
