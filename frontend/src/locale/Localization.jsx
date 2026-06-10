import { ConfigProvider, theme } from 'antd';
import enUS from 'antd/locale/en_US';
import { useThemeContext } from '@/context/ThemeContext';

export default function Localization({ children }) {
  const { isDarkMode } = useThemeContext();
  return (
    <ConfigProvider
      locale={enUS}
      theme={{
        token: {
          colorPrimary: '#339393',
          colorLink: '#1640D6',
          borderRadius: 2,
        },
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
