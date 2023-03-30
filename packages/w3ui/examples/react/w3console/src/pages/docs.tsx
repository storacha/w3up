import { DefaultLayout } from '../components/Layout'
import { Link } from '../components/elements'

export default function Docs () {
  return (
    <DefaultLayout>
      <div className='flex flex-col justify-start items-center min-h-full w-full text-left text-white p-8'>
        <h1 className='text-3xl mb-8 font-bold'>Welcome to the w3up web console beta!</h1>
        <p className='mb-4 w-4/5'>
          We're excited that you're using the w3up web console. This is a web-based interface
          to <Link href='https://github.com/web3-storage/w3up'>w3up</Link>, designed to make it easy
          for you to upload data to the Filecoin network.
        </p>
        <p className='mb-4 min-w-fit w-4/5'>
          If you are a developer interested in integrating with w3up, please check out:
        </p>
        <ul className='mb-4 w-4/5 list-disc pl-8'>
          <li>
            Our command line tool <Link href='https://github.com/web3-storage/w3cli#getting-started'>w3</Link>
          </li>
          <li>
            Our JavaScript library <Link href='https://github.com/web3-storage/w3up/tree/main/packages/w3up-client#about'>w3up-client</Link>
          </li>
          <li>
            Our library of headless React, Vue and SolidJS widgets <Link href='https://beta.ui.web3.storage/'>w3ui</Link>
          </li>
        </ul>
        <p className='mb-4 w-4/5'>
          Otherwise, visit the <Link href='https://github.com/web3-storage/w3up'>w3up</Link> repository
          where you'll find documentation and source code for the w3up protocol. You may
          also be interested in reading the <Link href='https://github.com/web3-storage/specs'>w3up specifications</Link> and
          learning more about <Link href='https://github.com/web3-storage/w3infra'>the operational infrastructure code</Link> that
          powers our implementation of w3up.
        </p>
      </div>
    </DefaultLayout>
  )
}