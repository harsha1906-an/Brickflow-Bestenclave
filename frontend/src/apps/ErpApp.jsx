import { useLayoutEffect } from 'react';
import { useEffect } from 'react';
import { selectAppSettings } from '@/redux/settings/selectors';
import { useDispatch, useSelector } from 'react-redux';

// import { Layout } from 'antd';

import { useAppContext } from '@/context/appContext';

// import Navigation from '@/apps/Navigation/NavigationContainer';

// import HeaderContent from '@/apps/Header/HeaderContainer';
import PageLoader from '@/components/PageLoader';

import { settingsAction } from '@/redux/settings/actions';

import { selectSettings } from '@/redux/settings/selectors';

import AppRouter from '@/router/AppRouter';

import useResponsive from '@/hooks/useResponsive';

import storePersist from '@/redux/storePersist';
import { request } from '@/request';

import useMobile from '@/hooks/useMobile';
import ProAppLayout from '@/layout/ProAppLayout';

export default function ErpCrmApp() {
  // const { Content } = Layout;

  const { state: stateApp, appContextAction } = useAppContext();
  const { isNavMenuClose, currentApp } = stateApp;

  const isMobile = useMobile();

  const dispatch = useDispatch();

  useLayoutEffect(() => {
    console.log('App Loaded - No Install Button Version');
    dispatch(settingsAction.list({ entity: 'setting' }));
  }, []);

  useEffect(() => {
    const fetchDefaultCompany = async () => {
      try {
        const data = await request.list({ entity: 'company' });
        console.log('Company Fetch Result:', data);
        if (data.success && data.result && data.result.length > 0) {
          appContextAction.company.set(data.result[0]._id);
        } else {
          console.log('No companies found or fetch failed');
        }
      } catch (err) {
        console.error('Failed to fetch companies:', err);
      }
    };
    fetchDefaultCompany();
  }, []);

  // const appSettings = useSelector(selectAppSettings);

  const { isSuccess: settingIsloaded } = useSelector(selectSettings);

  // useEffect(() => {
  //   const { loadDefaultLang } = storePersist.get('firstVisit');
  //   if (appSettings.brickflow_app_language && !loadDefaultLang) {
  //     window.localStorage.setItem('firstVisit', JSON.stringify({ loadDefaultLang: true }));
  //   }
  // }, [appSettings]);

  if (settingIsloaded)
    return (
      <ProAppLayout>
        <AppRouter />
      </ProAppLayout>
    );
  else return <PageLoader />;
}
