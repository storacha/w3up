import { useKeyring } from '@w3ui/react-keyring';
import { SpaceCreatorForm } from './SpaceCreator';

export function SpaceEnsurer ({
  children
}: {
  children: JSX.Element | JSX.Element[];
}): JSX.Element | JSX.Element[]{
  const [{ spaces, account }] = useKeyring();
  if (spaces && spaces.length > 0) {
    return children;
  }
  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <div className="text-gray-200 text-center">
        <h1 className="my-4 text-lg">Welcome {account}!</h1>
        <p>
          To get started with w3up you'll need to create a space.
        </p>
        <p>
          Give it a name and hit create!
        </p>
        <SpaceCreatorForm className='mt-4' />
      </div>
    </div>
  );
}
