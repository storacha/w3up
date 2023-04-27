import { useEffect } from 'react';
import { useKeyring } from '@w3ui/react-keyring';
import { useUploadsList } from '@w3ui/react-uploads-list';
import { ShareIcon } from '@heroicons/react/20/solid';
import md5 from 'blueimp-md5';
import { SpaceShare } from '../share';
import { Uploader } from './Uploader';
import { UploadsList } from './UploadsList';
import { SpaceRegistrar } from './SpaceRegistrar';

interface SpaceSectionProps {
  viewSpace: (did: string) => void;
  setShare: (share: boolean) => void;
  share: boolean;
}
export function SpaceSection (props: SpaceSectionProps): JSX.Element {
  const { viewSpace, share, setShare } = props;
  const [{ space }] = useKeyring();
  const [, { reload }] = useUploadsList();
  // reload the uploads list when the space changes
  // TODO: this currently does a network request - we'd like to just reset
  // to the latest state we have and revalidate in the background (SWR)
  // but it's not clear how all that state should work yet - perhaps
  // we need some sort of state management primitive in the uploads list?
  useEffect(() => {
    void reload();
  }, [space]);
  const registered = Boolean(space?.registered());
  return (
    <div>
      <header className='py-3'>
        {space !== undefined && (
          <div className='flex flex-row items-start gap-2'>
            <img
              title={space.did()}
              src={`https://www.gravatar.com/avatar/${md5(
                space.did()
              )}?d=identicon`}
              className='w-10 hover:saturate-200 saturate-0 invert border-solid border-gray-500 border' />
            <div className='grow overflow-hidden whitespace-nowrap text-ellipsis text-gray-500'>
              <h1 className='text-xl font-semibold leading-5 text-white'>
                {space.name() ?? 'Untitled'}
              </h1>
              <label className='font-mono text-xs'>
                {space.did()}
              </label>
            </div>
            <button
              className='h-6 w-6 text-gray-500 hover:text-gray-100'
              onClick={() => setShare(!share)}
            >
              <ShareIcon />
            </button>
          </div>
        )}
      </header>
      <div className='container mx-auto'>
        {share && <SpaceShare viewSpace={viewSpace} />}
        {registered && !share && (
          <>
            <Uploader
              onUploadComplete={() => {
                void reload();
              }} />
            <div className='mt-8'>
              <UploadsList />
            </div>
          </>
        )}
        {(space && !registered) && !share && <SpaceRegistrar />}
        {!space && (
          <div className="text-center">
            <h1 className="text-xl">Select a space from the dropdown on the left to get started.</h1>
          </div>
        )}
      </div>
    </div>
  );
}
