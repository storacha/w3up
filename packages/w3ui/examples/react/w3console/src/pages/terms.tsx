import { LogoIcon, tosUrl } from '../brand'

export default function Terms () {
  const serviceName = import.meta.env.VITE_W3UP_SERVICE_BRAND_NAME || 'dev.web3.storage'
  return (
    <div className='flex flex-col justify-start items-center min-h-full w-full bg-gray-900 text-white p-8'>
      <div className='flex flex-row gap-4'>
        <LogoIcon />
        <h1 className='text-2xl my-4 font-bold'>
          {serviceName} w3up beta Terms of Service
        </h1>
      </div>
      <p className='my-2 max-w-xl leading-relaxed'>
        {serviceName} w3up is currently a beta preview feature for {serviceName},
        and will eventually be used as the primary upload API for {serviceName}.{' '}
        {serviceName} includes <a className='underline' href="https://github.com/web3-storage/w3up-client">w3up-client</a>,{' '}
        <a className='underline' href="https://github.com/web3-storage/w3ui">w3ui</a>,{' '}
        <a className='underline' href="https://github.com/web3-storage/w3cli">w3cli</a>, and the{' '}
        <a className='underline' href="https://github.com/web3-storage/w3protocol">underlying APIs and services</a>{' '}
        for uploading data (collectively, the “w3up beta”). By using the {serviceName}{' '}
        w3up beta, you consent to the general {serviceName} <a className='underline' href={tosUrl}>Terms of Service</a>
        {import.meta.env.VITE_W3UP_PROVIDER == 'did:web:nft.storage' &&
          ', meaning you will only upload NFT data (i.e., off-chain NFT metadata and assets) via your account'
        }
        .
      </p>
      <p className='my-2 max-w-xl leading-relaxed '>
        {import.meta.env.VITE_W3UP_PROVIDER == 'did:web:web3.storage' &&
          'Registering for and uploading data to the web3.storage w3up beta is currently free. '
        }
        At the end of the preview period, accounts registered through the {serviceName} w3up beta
        (“w3up account(s)”) will ultimately be integrated with the broader account system of {serviceName}.
      </p>
      <h2 className='text-lg my-4 font-bold'>
        Accounts Linked to Email Addresses
      </h2>
      <p className='my-2 max-w-xl leading-relaxed'>
        In order to register for the {serviceName} w3up beta, you will be required to provide and verify an
        email address, which will be permanently associated with your {serviceName} w3up account and cannot be changed.
      </p>
      <p className='my-2 max-w-xl leading-relaxed'>
        If you sign up for the {serviceName} w3up beta with the same email address used for a {serviceName} account,
        at the end of the preview period we will merge your data uploaded through the w3up beta with the {serviceName}{' '}
        account linked to the same email.
      </p>
      <p className='my-2 max-w-xl leading-relaxed'>
        If you intend to separate uploaded data between web3.storage and NFT.Storage using w3up during the w3up beta period (e.g.,
        you want your NFT data to be stored for free on NFT.Storage and non-NFT data to be stored for payment on web3.storage),
        please register for the {import.meta.env.VITE_W3UP_PROVIDER == 'did:web:nft.storage' ? 'web3.storage' : 'NFT.Storage'} w3up beta separately.
      </p>
      <h2 className='text-lg my-4 font-bold'>
        w3up Accounts Moving to {serviceName}
      </h2>

      {import.meta.env.VITE_W3UP_PROVIDER == 'did:web:web3.storage' &&
        <div>
          <p className='my-2 max-w-xl leading-relaxed'>
            At the end of the preview period, your web3.storage w3up beta account will be integrated with the broader web3.storage
            account system. You acknowledge that once the preview period ends, all data uploaded through the w3up beta will be combined
            with existing uploads to your web3.storage account, and any aggregate data volume exceeding the Free Tier data limits of
            web3.storage during this preview window will eventually require payment for us to continue storing it and making it available.
          </p>
          <p className='my-2 max-w-xl leading-relaxed'>
            Please refer to the web3.storage website for <a className='underline' href="https://web3.storage/pricing/">information on pricing</a>. If you exceed
            the Free Tier data limits of web3.storage and do not intend to pay, please do not use the w3up beta for long-term storage.
          </p>
        </div>
      }
      {import.meta.env.VITE_W3UP_PROVIDER == 'did:web:nft.storage' &&
        <p className='my-2 max-w-xl leading-relaxed'>
          At the end of the preview period, your NFT.Storage w3up beta account will be integrated with the broader NFT.Storage account system.
          You acknowledge that once the preview period ends, all data uploaded through the w3up beta will be combined with existing uploads to
          your NFT.Storage account.
        </p>
      }
    </div>
  )
}
