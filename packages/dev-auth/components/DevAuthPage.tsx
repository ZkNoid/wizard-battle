'use client';

import '../styles/DevAuthPage.css';
import { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { login } from '../auth';
import { useRouter } from 'next/navigation';
import { ZknoidLogo } from '../assets/zknoid-logo';

const validationSchema = Yup.object({
  key: Yup.string().required('Key is required'),
});

export default function DevAuthPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: { key: string }) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { success } = await login({ key: values.key });
      if (success) {
        router.push('/');
      } else {
        setError('Invalid login. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dev-auth-container">
      <div className="dev-auth-content">
        {/* Logo Section */}
        <div className="logo-container">
          <ZknoidLogo className="logo" />
        </div>

        {/* Login Form */}
        <div className="form-container">
          <Formik
            initialValues={{ key: '' }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isValid, dirty }) => (
              <Form className="form">
                <div className="input-container">
                  <Field
                    name="key"
                    type="text"
                    placeholder="Enter key"
                    className="input-field"
                  />
                  <ErrorMessage
                    name="key"
                    component="div"
                    className="error-message"
                  />
                </div>

                {error && <div className="error-container">{error}</div>}

                <button
                  type="submit"
                  disabled={!isValid || !dirty || isSubmitting}
                  className="submit-button"
                >
                  {isSubmitting ? (
                    <div className="loading-container">
                      <div className="spinner"></div>
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    'Login'
                  )}
                </button>
              </Form>
            )}
          </Formik>
        </div>

        {/* Disclaimer */}
        <div className="disclaimer">
          <p className="disclaimer-text">
            You probably arrived here by accident
          </p>
        </div>
      </div>
    </div>
  );
}
