import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu } from 'antd';

import { useAppContext } from '@/context/appContext';

import useLanguage from '@/locale/useLanguage';
import logo from '@/style/images/colored-logo.png';

import useResponsive from '@/hooks/useResponsive';

import {
  SettingOutlined,
  CustomerServiceOutlined,
  ContainerOutlined,
  FileSyncOutlined,
  DashboardOutlined,
  TagOutlined,
  TagsOutlined,
  UserOutlined,
  CreditCardOutlined,
  MenuOutlined,
  FileOutlined,
  ShopOutlined,
  FilterOutlined,
  WalletOutlined,
  ReconciliationOutlined,
  FileDoneOutlined,
  ProjectOutlined,
  TeamOutlined,
  FileProtectOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

import useMobile from '@/hooks/useMobile'; // Keep hook for other logic if needed
import { useThemeContext } from '@/context/ThemeContext';

export default function Navigation() {
  return (
    <>
      <div className="mobile-only">
        <MobileSidebar />
      </div>
      <div className="desktop-only">
        <Sidebar collapsible={false} />
      </div>
    </>
  );
}

function Sidebar({ collapsible, isMobile = false }) {
  let location = useLocation();
  const { isDarkMode } = useThemeContext();

  const { state: stateApp, appContextAction } = useAppContext();
  const { isNavMenuClose } = stateApp;
  const { navMenu } = appContextAction;
  const [showLogoApp, setLogoApp] = useState(isNavMenuClose);
  const [currentPath, setCurrentPath] = useState(location.pathname.slice(1));

  const translate = useLanguage();
  const navigate = useNavigate();

  const items = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to={'/'}>{translate('dashboard')}</Link>,
    },
    {
      key: 'lead',
      icon: <CustomerServiceOutlined />,
      label: <Link to={'/lead'}>Leads</Link>,
    },
    {
      key: 'customer',
      icon: <CustomerServiceOutlined />,
      label: <Link to={'/customer'}>{translate('customers')}</Link>,
    },
    {
      key: 'villa',
      icon: <ShopOutlined />,
      label: <Link to={'/villa'}>Villas</Link>,
    },
    {
      key: 'booking',
      icon: <FileDoneOutlined />,
      label: <Link to={'/booking'}>Bookings</Link>,
    },
    {
      key: 'supplier',
      icon: <TeamOutlined />,
      label: <Link to={'/supplier'}>Suppliers</Link>,
    },
    {
      key: 'inventory',
      icon: <FileProtectOutlined />,
      label: <Link to={'/inventory'}>Inventory</Link>,
    },
    {
      key: 'labour',
      icon: <UserOutlined />,
      label: <Link to={'/labour'}>Labour</Link>,
    },
    {
      key: 'attendance',
      icon: <TagOutlined />,
      label: <Link to={'/attendance'}>Attendance</Link>,
    },
    {
      key: 'pettycash',
      icon: <WalletOutlined />,
      label: <Link to={'/pettycash'}>Petty Cash</Link>,
    },
    {
      key: 'daily-summary',
      icon: <ContainerOutlined />,
      label: <Link to={'/daily-summary'}>Daily Expenses</Link>,
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: <Link to={'/reports'}>Reports</Link>,
    },
    {
      key: 'villa-reports',
      icon: <ProjectOutlined />,
      label: <Link to={'/villa-reports'}>Villa Reports</Link>,
    },
    {
      key: 'expense',
      icon: <DollarOutlined />,
      label: <Link to={'/expense'}>Expenses</Link>,
    },
    {
      key: 'payment',
      icon: <CreditCardOutlined />,
      label: <Link to={'/payment'}>{translate('payments')}</Link>,
    },

    {
      key: 'approvals',
      icon: <FileProtectOutlined />,
      label: <Link to={'/approvals'}>{translate('Approvals')}</Link>,
    },
    {
      key: 'taxes',
      label: <Link to={'/taxes'}>{translate('taxes')}</Link>,
      icon: <ShopOutlined />,
    },
    {
      key: 'generalSettings',
      label: <Link to={'/settings'}>{translate('settings')}</Link>,
      icon: <SettingOutlined />,
    },
    {
      key: 'about',
      label: <Link to={'/about'}>{translate('about')}</Link>,
      icon: <ReconciliationOutlined />,
    },
  ];

  useEffect(() => {
    if (location)
      if (currentPath !== location.pathname) {
        if (location.pathname === '/') {
          setCurrentPath('dashboard');
        } else setCurrentPath(location.pathname.slice(1));
      }
  }, [location, currentPath]);

  useEffect(() => {
    if (isNavMenuClose) {
      setLogoApp(isNavMenuClose);
    }
    const timer = setTimeout(() => {
      if (!isNavMenuClose) {
        setLogoApp(isNavMenuClose);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isNavMenuClose]);
  const onCollapse = () => {
    navMenu.collapse();
  };

  return (
    <Sider
      collapsible={collapsible}
      collapsed={collapsible ? isNavMenuClose : collapsible}
      onCollapse={onCollapse}
      className={isMobile ? "navigation mobile-sider" : "navigation"}
      width={256} // <--- SIDEBAR WIDTH
      style={{
        overflow: 'auto',
        height: '100vh',
        background: isDarkMode ? (isMobile ? 'transparent' : '#0c0d0e') : '#fff', // Pure dark in dark mode

        // <--- MOBILE SIDEBAR POSITIONING
        position: isMobile ? 'absolute' : 'relative',
        bottom: '20px',
        ...(!isMobile && {
          // border: 'none',
          ['left']: '20px',
          top: '20px',
          // borderRadius: '8px',
        }),
      }}
      theme={isDarkMode ? 'dark' : 'light'}
    >
      <div
        className="logo"
        onClick={() => navigate('/')}
        style={{
          cursor: 'pointer',
          padding: '25px 20px',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img src={logo} alt="Brick Flow Logo" style={{ height: '70px', maxWidth: '100%', objectFit: 'contain' }} />
      </div>
      <Menu
        items={items}
        mode="inline"
        theme={isDarkMode ? 'dark' : 'light'}
        selectedKeys={[currentPath]}
        style={{
          width: 256,
          background: isMobile ? 'transparent' : (isDarkMode ? '#0c0d0e' : '#fff') // Pure dark in dark mode
        }}
      />
    </Sider>
  );
}

function MobileSidebar() {
  const [visible, setVisible] = useState(false);
  const { isDarkMode } = useThemeContext();
  const showDrawer = () => {
    setVisible(true);
  };
  const onClose = () => {
    setVisible(false);
  };

  return (
    <>
      <Button
        type="text"
        size="large"
        onClick={showDrawer}
        className="mobile-sidebar-btn"
        style={{ ['marginLeft']: 25 }}
      >
        <MenuOutlined style={{ fontSize: 18 }} />
      </Button>
      <Drawer
        width={250}
        placement={'left'}
        closable={false}
        onClose={onClose}
        open={visible}
        styles={{
          body: { padding: 0, height: '100%', backdropFilter: 'blur(20px)', background: isDarkMode ? 'rgba(12, 13, 14, 0.7)' : 'rgba(255, 255, 255, 0.7)' }
        }}
        style={{ background: 'transparent' }}
      >
        <Sidebar collapsible={false} isMobile={true} />
      </Drawer>
    </>
  );
}
