import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import useLanguage from '@/locale/useLanguage';
import { Form, Button } from 'antd';
import { register } from '@/redux/auth/actions';
import { selectAuth } from '@/redux/auth/selectors';
import RegisterForm from '@/forms/RegisterForm';
import Loading from '@/components/Loading';
import AuthModule from '@/modules/AuthModule';

const RegisterPage = () => {
  const translate = useLanguage();
  const { isLoading, isSuccess } = useSelector(selectAuth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const onFinish = (values) => {
    dispatch(register({ registerData: values }));
  };

  useEffect(() => {
    if (isSuccess) {
        // Wait for a bit or redirect immediately? 
        // register action dispatches REGISTER_SUCCESS but does not login automatically in my backend code (implied by "Account created successfully" and NO auth token returned usually in register unless implemented).
        // My backend register returns success but NOT the auth token/cookie logic that login does?
        // Wait, login.js calls `authUser(req, res, { user, databasePassword, password, UserPasswordModel })`.
        // My `register.js` just returns 200 OK.
        // So the user is NOT logged in.
        // I should redirect to login or login automatically.
        // If I want to redirect to login, I should navigate to '/login'.
        navigate('/login');
    } 
  }, [isSuccess]);

  const FormContainer = () => {
    return (
      <Loading isLoading={isLoading}>
        <Form
          layout="vertical"
          name="register_form"
          className="register-form"
          onFinish={onFinish}
        >
          <RegisterForm />
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="register-form-button"
              loading={isLoading}
              size="large"
              block
            >
              {translate('Register')}
            </Button>
          </Form.Item>
        </Form>
      </Loading>
    );
  };

  return <AuthModule authContent={<FormContainer />} AUTH_TITLE="Create Account" />;
};

export default RegisterPage;
