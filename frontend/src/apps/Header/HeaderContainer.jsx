import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, Layout, Badge, Button } from 'antd';

// import Notifications from '@/components/Notification';

import { LogoutOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons';

import { selectCurrentAdmin } from '@/redux/auth/selectors';

import { FILE_BASE_URL } from '@/config/serverApiConfig';

import useLanguage from '@/locale/useLanguage';
import logo from '@/style/images/logo.png';
import useResponsive from '@/hooks/useResponsive';

import InstallApp from '@/components/InstallApp';
import ThemeToggle from '@/components/ThemeToggle';

export default function HeaderContent() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const { Header } = Layout;
  const { isMobile } = useResponsive();

  const translate = useLanguage();
  const navigate = useNavigate();

  const ProfileDropdown = () => {
    const navigate = useNavigate();
    return (
      <div className="profileDropdown" onClick={() => navigate('/profile')}>
        <Avatar
          size="large"
          className="last"
          src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
          style={{
            color: '#fff',
            background: currentAdmin?.photo ? 'none' : 'linear-gradient(135deg, #339393 0%, #1640D6 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {currentAdmin?.name?.charAt(0)?.toUpperCase()}
        </Avatar>
        <div className="profileDropdownInfo">
          <p>
            {currentAdmin?.name} {currentAdmin?.surname}
          </p>
          <p>{currentAdmin?.email}</p>
        </div>
      </div>
    );
  };

  const DropdownMenu = ({ text }) => {
    return <span style={{}}>{text}</span>;
  };

  const items = [
    {
      label: <ProfileDropdown className="headerDropDownMenu" />,
      key: 'ProfileDropdown',
    },
    {
      type: 'divider',
    },
    {
      icon: <UserOutlined />,
      key: 'settingProfile',
      label: (
        <Link to={'/profile'}>
          <DropdownMenu text={translate('profile_settings')} />
        </Link>
      ),
    },
    {
      icon: <ToolOutlined />,
      key: 'settingApp',
      label: <Link to={'/settings'}>{translate('app_settings')}</Link>,
    },

    {
      type: 'divider',
    },

    {
      icon: <LogoutOutlined />,
      key: 'logout',
      label: <Link to={'/logout'}>{translate('logout')}</Link>,
    },
  ];

  return (
    <Header
      style={{
        padding: '20px',
        background: 'transparent',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', right: isMobile ? '60px' : '170px' }}>
        <InstallApp />
      </div>
      {!isMobile && (
        <div style={{ position: 'absolute', right: '110px' }}>
          <ThemeToggle />
        </div>
      )}

      {isMobile && (
        <div className="mobile-header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', position: 'absolute', top: '75%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <img src={logo} alt="Logo" style={{ height: '90px' }} />
        </div>
      )}

      <Dropdown
        menu={{
          items,
        }}
        trigger={['click']}
        placement="bottomRight"
        stye={{ width: '280px' }}
      >
        <Avatar
          className="last"
          src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
          style={{
            color: '#fff',
            background: currentAdmin?.photo ? 'none' : 'linear-gradient(135deg, #339393 0%, #1640D6 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            position: 'absolute',
            right: '8px',
          }}
          size="large"
        >
          {currentAdmin?.name?.charAt(0)?.toUpperCase()}
        </Avatar>
      </Dropdown>
    </Header>
  );
}
