import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-layout';
import { 
  DashboardOutlined, 
  CustomerServiceOutlined, 
  ShopOutlined, 
  FileDoneOutlined, 
  TeamOutlined, 
  FileProtectOutlined,
  TagOutlined,
  FileOutlined,
  UserOutlined,
  CreditCardOutlined,
  WalletOutlined,
  FileSyncOutlined,
  ContainerOutlined,
  ProjectOutlined,
  DollarOutlined,
  ReconciliationOutlined,
  SettingOutlined,
  ToolOutlined,
  LogoutOutlined,
  HistoryOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { Avatar, Dropdown, Button, ConfigProvider } from 'antd';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import useLanguage from '@/locale/useLanguage';
import { FILE_BASE_URL } from '@/config/serverApiConfig';
import { useThemeContext } from '@/context/ThemeContext';
import useMobile from '@/hooks/useMobile';
import ThemeToggle from '@/components/ThemeToggle'; 
import NotificationBell from '@/components/NotificationBell';
import logoLight from '@/style/images/colored-logo.png';
import logoDark from '@/style/images/logo.png'; 

export default function ProAppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const translate = useLanguage();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const { isDarkMode, toggleTheme } = useThemeContext();
  const isMobile = useMobile();
  const logo = logoDark;

  const [pathname, setPathname] = useState(location.pathname);

  // Mapped from NavigationContainer.jsx
  const menuData = [
    { path: '/', name: translate('dashboard'), icon: <DashboardOutlined /> },
    { path: '/lead', name: 'Leads', icon: <CustomerServiceOutlined /> },
    { path: '/customer', name: translate('customers'), icon: <CustomerServiceOutlined /> },
    { path: '/villa', name: 'Villas', icon: <ShopOutlined /> },
    { path: '/booking', name: 'Bookings', icon: <FileDoneOutlined /> },
    { path: '/supplier', name: 'Suppliers', icon: <TeamOutlined /> },
    { path: '/inventory', name: 'Inventory', icon: <FileProtectOutlined /> },
    { path: '/labour', name: 'Labour', icon: <UserOutlined /> },
    { path: '/attendance', name: 'Attendance', icon: <TagOutlined /> },
    { path: '/pettycash', name: 'Petty Cash', icon: <WalletOutlined /> },
    { path: '/daily-summary', name: 'Daily Expenses', icon: <ContainerOutlined /> },
    { path: '/reports', name: 'Reports', icon: <FileTextOutlined /> },
    { path: '/villa-reports', name: 'Villa Reports', icon: <ProjectOutlined /> },
    { path: '/expense', name: 'Expenses', icon: <DollarOutlined /> },
    { path: '/payment', name: translate('payments'), icon: <CreditCardOutlined /> },
    { path: '/quote', name: translate('quote'), icon: <FileSyncOutlined /> },
    { path: '/approvals', name: translate('Approvals'), icon: <FileProtectOutlined /> },
    { path: '/taxes', name: translate('taxes'), icon: <ShopOutlined /> },
    { path: '/audit-logs', name: translate('Activity Logs'), icon: <HistoryOutlined /> },
    { path: '/settings', name: translate('settings'), icon: <SettingOutlined /> },
    { path: '/about', name: translate('about'), icon: <ReconciliationOutlined /> },
  ];

  const menuProps = {
    route: {
      routes: menuData,
    },
    location: {
      pathname: location.pathname,
    },
  };

  const logoutItem = {
    label: <Link to={'/logout'}>{translate('logout')}</Link>,
    key: 'logout',
    icon: <LogoutOutlined />,
  };

  const settingsProfileItem = {
    label: <Link to={'/profile'}>{translate('profile_settings')}</Link>,
    key: 'profile',
    icon: <UserOutlined />,
  };
  
  const settingsAppItem = {
    label: <Link to={'/settings'}>{translate('app_settings')}</Link>,
    key: 'settings',
    icon: <ToolOutlined />,
  };

  return (
    <div style={{ height: '100vh' }}>
      <ProLayout
        {...menuProps}
        logo={null}
        title="BrickFlow"
        layout="side"
        navTheme={isDarkMode ? 'realDark' : 'light'}
        contentWidth="Fluid"
        fixedHeader
        fixSiderbar
        siderWidth={220}
        suppressSiderWhenMenuEmpty
        menuItemRender={(item, dom) => (
           <div
             onClick={() => {
               setPathname(item.path || '/');
               navigate(item.path || '/');
             }}
           >
             {dom}
           </div>
         )}
        
        // RENDER 1: Left Side (Hamburger + Title only on Desktop)
        headerTitleRender={(logoImg, title, props) => {
          return (
            <div
              onClick={() => navigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                paddingLeft: isMobile ? '8px' : '0',
                zIndex: 999,
                position: 'relative'
              }}
            >
               {!isMobile && (
                 <span style={{ 
                    fontSize: '18px', 
                    fontWeight: 600, 
                    color: isDarkMode ? 'white' : 'black',
                 }}>
                   {title}
                 </span>
               )}
            </div>
          );
        }}
        
        // RENDER 2: Center (Logo)
        headerContentRender={() => {
          return (
             <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            >
               <a 
                 onClick={() => navigate('/')} 
                 style={{ 
                   pointerEvents: 'auto', 
                   display: 'flex', 
                   alignItems: 'center'
                 }}
               >
                  <img src={logo} alt="logo" style={{ maxHeight: 60 }} />
               </a>
            </div>
          );
        }}
        avatarProps={{
           src: currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined,
           title: currentAdmin?.name,
            render: (props, dom) => (
              <Dropdown
                menu={{ items: [settingsProfileItem, settingsAppItem, { type: 'divider' }, logoutItem] }}
              >
                {dom}
              </Dropdown>
            ),
        }}
        actionsRender={() => {
          if (isMobile) return [<ThemeToggle key="theme" />];
          return [
            <NotificationBell key="bell" />,
            <ThemeToggle key="theme" />
          ];
        }}
      >
        <div style={{ 
          minHeight: '100vh',
          paddingTop: '80px', /* Ensure content is pushed below fixed header */
          paddingInline: isMobile ? '12px' : '24px',
          overflow: 'auto',
          width: '100%',
        }}>
            {children}
        </div>
        
        {/* Mobile Floating Notification Bell */}
        {isMobile && (
          <div style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            zIndex: 1000,
            backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
            borderRadius: '50%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isDarkMode ? '1px solid #333' : '1px solid #eee'
          }}>
             <NotificationBell />
          </div>
        )}

      </ProLayout>
    </div>
  );
}