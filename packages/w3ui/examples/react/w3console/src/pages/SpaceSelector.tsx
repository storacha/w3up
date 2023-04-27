import type { Space } from '@w3ui/react-keyring';
import { SpaceFinder } from '../components/SpaceFinder';

export function SpaceSelector (props: any): JSX.Element {
  const { selected, setSelected, spaces } = props;
  return (
    <div>
      <h3 className='text-xs tracking-wider uppercase font-bold my-2 text-gray-400 font-mono'>
        Spaces
      </h3>
      <SpaceFinder
        spaces={spaces}
        selected={selected}
        setSelected={(space: Space) => {
          void setSelected(space.did());
        }} />
    </div>
  );
}
