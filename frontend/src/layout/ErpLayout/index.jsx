import { ErpContextProvider } from '@/context/erp';
import { Layout, Grid } from 'antd';
import { useSelector } from 'react-redux';

const { Content } = Layout;
const { useBreakpoint } = Grid;

export default function ErpLayout({ children }) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  return (
    <ErpContextProvider>
      <Content
        className={isMobile ? "layoutPadding" : "whiteBox shadow layoutPadding"}
        style={{
          margin: isMobile ? '0 auto' : '30px auto',
          width: '100%',
          maxWidth: '100%',
          minHeight: isMobile ? 'auto' : '600px',
          padding: isMobile ? '8px 0px' : undefined,
          background: isMobile ? 'transparent' : undefined,
          border: isMobile ? 'none' : undefined,
          boxShadow: isMobile ? 'none' : undefined
        }}
      >
        {children}
      </Content>
    </ErpContextProvider>
  );
}
