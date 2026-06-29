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
  FileTextOutlined,
  ScanOutlined,
  MenuOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  ContactsOutlined
} from '@ant-design/icons';
import { Avatar, Dropdown, Button, ConfigProvider, Drawer, Divider } from 'antd';
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
  const [moreDrawerVisible, setMoreDrawerVisible] = useState(false);

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
    { path: '/scan-bills', name: 'Scan Bills', icon: <ScanOutlined /> },
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

  const operationsMenu = [
    { path: '/lead', name: 'Leads', icon: <CustomerServiceOutlined /> },
    { path: '/customer', name: 'Customers', icon: <CustomerServiceOutlined /> },
    { path: '/villa', name: 'Villas', icon: <ShopOutlined /> },
    { path: '/booking', name: 'Bookings', icon: <FileDoneOutlined /> },
    { path: '/supplier', name: 'Suppliers', icon: <TeamOutlined /> },
    { path: '/inventory', name: 'Inventory', icon: <FileProtectOutlined /> },
    { path: '/labour', name: 'Labour', icon: <UserOutlined /> },
    { path: '/pettycash', name: 'Petty Cash', icon: <WalletOutlined /> },
    { path: '/expense', name: 'Expenses List', icon: <DollarOutlined /> },
    { path: '/payment', name: 'Payments', icon: <CreditCardOutlined /> },
    { path: '/quote', name: 'Quotes', icon: <FileSyncOutlined /> },
    { path: '/approvals', name: 'Approvals', icon: <FileProtectOutlined /> },
    { path: '/taxes', name: 'Taxes', icon: <ShopOutlined /> },
  ];

  const reportsMenu = [
    { path: '/reports', name: 'Reports', icon: <FileTextOutlined /> },
    { path: '/villa-reports', name: 'Villa Reports', icon: <ProjectOutlined /> },
    { path: '/audit-logs', name: 'Activity Logs', icon: <HistoryOutlined /> },
    { path: '/about', name: 'About', icon: <ReconciliationOutlined /> },
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

  const handleMobileNavClick = (path) => {
    setMoreDrawerVisible(false);
    navigate(path);
  };

  const renderMobileNavItem = (path, icon, label, onClickHandler = null) => {
    const isActive = onClickHandler 
      ? moreDrawerVisible 
      : (location.pathname === path || (path !== '/' && location.pathname.startsWith(path)));
      
    const handleClick = onClickHandler || (() => navigate(path));

    return (
      <div 
        onClick={handleClick} 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flex: isActive ? '0 0 auto' : 1,
          padding: isActive ? '4px 16px' : '4px 0',
          borderRadius: isActive ? '20px' : '0',
          backgroundColor: isActive 
            ? (isDarkMode ? '#004493' : '#d8e2ff') 
            : 'transparent',
          color: isActive 
            ? (isDarkMode ? '#adc7ff' : '#0059bb') 
            : (isDarkMode ? '#888' : '#575f67'),
          transition: 'all 0.2s ease',
          minWidth: isActive ? '85px' : '65px'
        }}
      >
        <div style={{ fontSize: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1px' }}>
          {icon}
        </div>
        <span style={{ fontSize: '9px', fontWeight: isActive ? '700' : '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
      </div>
    );
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
          paddingTop: isMobile ? '64px' : '80px', /* Ensure content is pushed below fixed header */
          paddingBottom: isMobile ? '80px' : '24px', /* Pad bottom on mobile to avoid bottom nav overlay */
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

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          backgroundColor: isDarkMode ? '#141414' : '#ffffff',
          borderTop: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 1000,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
          paddingBottom: 'safe-area-inset-bottom',
          paddingLeft: '8px',
          paddingRight: '8px'
        }}>
          {renderMobileNavItem('/', <DashboardOutlined />, 'Dashboard')}
          {renderMobileNavItem('/villa', <ApartmentOutlined />, 'Villas')}
          {renderMobileNavItem('/booking', <CalendarOutlined />, 'Bookings')}
          {renderMobileNavItem('/lead', <ContactsOutlined />, 'Leads')}
          {renderMobileNavItem(null, <MenuOutlined />, 'More', () => setMoreDrawerVisible(true))}
        </div>
      )}

      {/* Mobile More Navigation Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MenuOutlined style={{ color: '#1890ff' }} />
            <span>More Features</span>
          </div>
        }
        placement="bottom"
        onClose={() => setMoreDrawerVisible(false)}
        open={moreDrawerVisible}
        height="80vh"
        bodyStyle={{ 
          padding: '16px', 
          backgroundColor: isDarkMode ? '#141414' : '#fafafa',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Operations Section */}
          <div>
            <h4 style={{ 
              color: isDarkMode ? '#888' : '#999', 
              marginBottom: 12, 
              textTransform: 'uppercase', 
              fontSize: '11px', 
              letterSpacing: '0.5px',
              fontWeight: 'bold'
            }}>
              Operations & Management
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {operationsMenu.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleMobileNavClick(item.path)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 6px',
                    borderRadius: '8px',
                    backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
                    border: isDarkMode ? '1px solid #303030' : '1px solid #e8e8e8',
                    cursor: 'pointer',
                    textAlign: 'center',
                    color: location.pathname === item.path ? '#1890ff' : (isDarkMode ? '#ddd' : '#555'),
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '6px', color: location.pathname === item.path ? '#1890ff' : '#888' }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 500, lineHeight: 1.2 }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* Reports & Logs */}
          <div>
            <h4 style={{ 
              color: isDarkMode ? '#888' : '#999', 
              marginBottom: 12, 
              textTransform: 'uppercase', 
              fontSize: '11px', 
              letterSpacing: '0.5px',
              fontWeight: 'bold'
            }}>
              Reports & Activity
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              {reportsMenu.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleMobileNavClick(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
                    border: isDarkMode ? '1px solid #303030' : '1px solid #e8e8e8',
                    cursor: 'pointer',
                    color: location.pathname === item.path ? '#1890ff' : (isDarkMode ? '#ddd' : '#555'),
                  }}
                >
                  <div style={{ fontSize: '18px', color: location.pathname === item.path ? '#1890ff' : '#888' }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* Settings Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              onClick={() => handleMobileNavClick('/profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
                border: isDarkMode ? '1px solid #303030' : '1px solid #e8e8e8',
                cursor: 'pointer',
                color: isDarkMode ? '#ddd' : '#555'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
                <span style={{ fontSize: '13px' }}>Profile Settings</span>
              </div>
            </div>

            <div
              onClick={() => handleMobileNavClick('/settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
                border: isDarkMode ? '1px solid #303030' : '1px solid #e8e8e8',
                cursor: 'pointer',
                color: isDarkMode ? '#ddd' : '#555'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <SettingOutlined style={{ fontSize: '16px', color: '#52c41a' }} />
                <span style={{ fontSize: '13px' }}>App Settings</span>
              </div>
            </div>

            <div
              onClick={() => handleMobileNavClick('/logout')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? '#2c1414' : '#fff1f0',
                border: isDarkMode ? '1px solid #5c2424' : '1px solid #ffa39e',
                cursor: 'pointer',
                color: '#f5222d'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LogoutOutlined style={{ fontSize: '16px', color: '#f5222d' }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Logout</span>
              </div>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}