import { tosUrl } from '../brand'
import { DefaultLayout } from '../components/Layout'
import { Link } from '../components/elements'

export default function Terms () {
  const serviceName = import.meta.env.VITE_W3UP_SERVICE_BRAND_NAME || 'dev.web3.storage'
  return (
    <DefaultLayout>
      <div className='flex flex-col justify-start items-center min-h-full w-full text-white p-8'>
        <div className='flex flex-row gap-4'>
          <h1 className='text-2xl my-4 font-bold'>
            {serviceName} w3up beta Terms of Service
          </h1>
        </div>
        <p className='my-2 w-4/5 leading-relaxed'>
          {serviceName} w3up is currently a beta preview feature for web3.storage,
          and will eventually be used as the primary upload API for web3.storage.{' '}
          This includes <Link href="https://github.com/web3-storage/w3up-client">w3up-client</Link>,{' '}
          <Link href="https://github.com/web3-storage/w3ui">w3ui</Link>,{' '}
          <Link href="https://github.com/web3-storage/w3cli">w3cli</Link>, and the{' '}
          <Link href="https://github.com/web3-storage/w3protocol">underlying APIs and services</Link>{' '}
          for uploading data (collectively, the “w3up beta”). By using the web3.storage{' '}
          w3up beta, you consent to the general web3.storage <Link href={tosUrl}>Terms of Service</Link>.
        </p>
        <p className='my-2 w-4/5 leading-relaxed'>
          In order to register for the web3.storage w3up beta, you will be required to provide and verify an
          email address, which will be permanently associated with your web3.storage w3up account and cannot be 
          changed, even at the end of the beta period.
        </p>
        <p className='my-2 w-4/5 leading-relaxed'>
          Registering for and uploading data to the web3.storage w3up beta is currently free. However, at the 
          end of the beta period, you will be required to pay for usage over the Free tier limit of 5GB.
          Please refer to the web3.storage website for <Link href="https://web3.storage/pricing/">information on pricing</Link>. If you exceed
          the Free Tier data limits of web3.storage and do not intend to pay, please do not use the w3up beta for long-term storage.
        </p>
      </div>
    </DefaultLayout>
  )
}
