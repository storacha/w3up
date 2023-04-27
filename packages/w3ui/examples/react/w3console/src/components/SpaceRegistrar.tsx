import { useState } from 'react';
import { useKeyring } from '@w3ui/react-keyring';
import Loader from './Loader';

export function SpaceRegistrar (): JSX.Element {
  const [{ account }, { registerSpace }] = useKeyring();
  const [submitted, setSubmitted] = useState(false);
  async function onSubmit (e: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    e.preventDefault();
    if (account) {
      setSubmitted(true);
      try {
        await registerSpace(account, { provider: import.meta.env.VITE_W3UP_PROVIDER });
      } catch (err) {
        console.log(err);
        throw new Error('failed to register', { cause: err });
      } finally {
        setSubmitted(false);
      }
    } else {
      throw new Error('cannot register space, no account found, have you authorized your email?');
    }
  }
  return (
    <div className='flex flex-col items-center space-y-12 pt-12'>
      <div className='flex flex-col items-center space-y-4'>
        <h3 className='text-lg'>This space is not yet registered.</h3>
        <p>
          Click the button below to register this space and start uploading.
        </p>
      </div>
      <div className='flex flex-col items-center space-y-4'>
        {submitted ? (
          <Loader className='w-6' />
        ) : (
          <button className='w3ui-button' onClick={onSubmit}>Register Space</button>
        )}
      </div>
    </div>
  );
}
