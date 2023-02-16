import React from 'react'
import * as Link from 'multiformats/link'
// these imports used by commented-out functions below, delete if we don't bring those back soon
// import { sha256 } from 'multiformats/hashes/sha2'
// import * as raw from 'multiformats/codecs/raw'
import { UploadsList } from '@w3ui/react'
import { UploadsListContext } from '@w3ui/react-uploads-list'
import '@w3ui/react/src/styles/uploads-list.css'

// More on how to set up stories at: https://storybook.js.org/docs/7.0/react/writing-stories/introduction
export default {
  title: 'w3ui/UploadsList',
  component: UploadsList,
  tags: ['autodocs'],
}

// More on writing stories with args: https://storybook.js.org/docs/7.0/react/writing-stories/args
export const Empty = {
  render: () => {
    const state = { data: [], loading: false }
    const actions = {
      next: async (): Promise<void> => {},
      reload: async (): Promise<void> => {},
    }
    return (
      <UploadsListContext.Provider value={[state, actions]}>
        <UploadsList />
      </UploadsListContext.Provider>
    )
  },
}

export const OneItem = {
  render: () => {
    const state = {
      data: [
        { root: Link.parse('QmPr755CxWUwt39C2Yiw4UGKrv16uZhSgeZJmoHUUS9TSJ') },
      ],
      loading: false,
    }
    const actions = {
      next: async (): Promise<void> => {
        console.log('NEXT')
      },
      reload: async (): Promise<void> => {},
    }
    return (
      <UploadsListContext.Provider value={[state, actions]}>
        <UploadsList />
      </UploadsListContext.Provider>
    )
  },
}

export const OneHundredItems = {
  render: () => {
    const state = {
      data: oneHundredCids.map((root) => ({ root })),
      loading: false,
    }
    const actions = {
      next: async (): Promise<void> => {},
      reload: async (): Promise<void> => {},
    }
    return (
      <UploadsListContext.Provider value={[state, actions]}>
        <UploadsList />
      </UploadsListContext.Provider>
    )
  },
}

/* commenting because currently unused but potentially useful soon
async function randomCid (): Promise<CID> {
  const bytes = new TextEncoder().encode(Date.now().toString() + Math.random().toString())
  const hash = await sha256.digest(bytes)
  return CID.create(1, raw.code, hash)
}

async function createUploadsList (n = 100) {
  const cids = await Promise.all(Array(n).fill(0).map(randomCid))
  return cids.map(root => ({ root }))
}
*/

// the render function must be sync, and top level await causes an initial error in storybook render.
// so we prebake CIDs here.
const oneHundredCids = [
  'bafkreibsonqoninfxbb7w3yfmam5ruuerhl6ymv6s4ergp7eq5rmynttpy',
  'bafkreiahfmollb25srbujyaqlpwoz6w5omo5v4n22fggtftgf4h4kweyb4',
  'bafkreidumsuew5xlpcv3ndnuxcs3bm6pmthwrxx2u4qalwh34cso3t5hfu',
  'bafkreiedhawxxgi4ugahiqzenmhhxlu2xsfxhlnkteoogejht5o4pydvxy',
  'bafkreickwiysc2bacgcfsmkm3npejuarfovs5ypr3rpkv45j4l55qw6fma',
  'bafkreifkb6lw3t6iuc3vxbgefapmzt4zhbjhr3h6yfwc2m6x3ccuz37tzi',
  'bafkreiaqokxs3kbp45cc7hoq7z3gi2ya2zldtm5v2x36qebp4pdmjlb7h4',
  'bafkreifskfwnwbi6bwtzk6632yr4twx66ipiag7tm5m3g3w6wzarmualcm',
  'bafkreiazqsvl4x4xvkniwtlxttyjteq3h7zxutvdl7rz55irrmzcxfvhuy',
  'bafkreifrvihfupfkdqix4p6dhvobngudv5t7f4twj5zbg2wdvaxow7imo4',
  'bafkreibf3gib3emtqhhsiruem3iyoay6lklgvqq3j72chha7g77vk3or4m',
  'bafkreicdvjgxcdzazn5tsr7qscpmpibk4szxqp3zc65mdqoft65yw6k4n4',
  'bafkreihlan57k6jspljcpjqfte7h3z4xoto7phd6nql5zdonpyuzxomlja',
  'bafkreihto2dwebxqr3j46gwdsotwbwlmg7wrwxtjduu5hcahuhhqr3cydu',
  'bafkreibypxd7m7rnhtzpkk3l75fing6w5jurdsaxa53twnf4lzbvnx75hq',
  'bafkreiduxndw46umh7tqutpebr7akl7mzvtezpicnrmxfko4scavq2av5i',
  'bafkreibk7ec4nfqdko7hdajhqdohmtj6xfxvffcaz6reutcdcea2o5sx6m',
  'bafkreibckfrvqqomptk2s7tvcl4b2a26w3e4m4vv2mkxtghoxqa47gafea',
  'bafkreihslig7bmoq7c5kj2c4phn4rv4mhmydmlzypsftr6nar6r56tbimq',
  'bafkreigp6mc3vgh2goq6jxgst5ly2uahypp2gxygkph4u2m4qndi6tep5i',
  'bafkreihnrjolv7vhce6ssave36rgquoxgd7qcuklc5gvxirubmo27luf3a',
  'bafkreiesdifasmotedtuksbhew7t4avbt2s6tjuf7nclocmt7bnnzffqla',
  'bafkreiccriwhzgdso7pnwb744e2ajekrfnbbgxwsc54au26ecapm2ay47u',
  'bafkreialyo3qwihe7rhikyhlyjddd4jxfqcodgwzwyi2xjrrdpp7zy63g4',
  'bafkreiandr4awdbejjhju6szvzrrktu4hzeexk7iwprae67fj7hd433fcm',
  'bafkreigiet3pkg2i54ljxmi6fk3hl6jxndcejx5ecpsvdjkxu4vnt6mcf4',
  'bafkreiagxi4vpqtqtprusol72zmyvlruomvbqhozgny6f6jajvu4u2x3ua',
  'bafkreifaekzp3jrptgs6o7ghsdz6nkjo7meifn5pyc6cthzepvj3dek7xe',
  'bafkreiedzpsnbc4bkivesejnydjhv7r6hpz45vpu2cglohe32fmupnrkie',
  'bafkreihxudpfrnj77rkowb6txly3636st5qqorl7gbf7ddt3s5pjomuqhi',
  'bafkreibec3ev4apb6ofsg4fuxiv6hhj3gcs7epfxqsdky4r3d5rnn5ixb4',
  'bafkreifbi5mbhklj654y7dlhxbhtkv5bjb3uyupzxu6jqimyct6nxjme4e',
  'bafkreig67ndw55otkdo7xjrzjspyb76ynqh3tloggraghehnndlmvuyj5i',
  'bafkreidcaucbjc2tpqauaptndkbwiy5qdkjtb5bm2o2mumq7ookw2tfj2q',
  'bafkreiehc2pfvyy32vqpxmwpsub7sna6l4u5erxr7crjytexvohz5b2zbi',
  'bafkreib6ny57vpduz2w3hlqukevoaklf6x3fqojnkvnodyom2ye7mulr7e',
  'bafkreihpzwbgx2aqzxzbieh33g2dkbcs5rvx2nwtdwsbfmv5zz763kbfzq',
  'bafkreibqsg7zdtbvnvttudw5tqxcddo2ny5myrlkppamrrssogjvf4otki',
  'bafkreighx24taiavzqatyxiq73rhqq2wn73jn67vajr24o4g3zg67cspxi',
  'bafkreigettj2szet7jbr7s4xpzgkhsmjr5eivhz44ij7du7omkqdpfosbu',
  'bafkreieastfvfxwnvqvqhqhdeccxevtrw5z6tkvbaqlv6erwxap6frbkbu',
  'bafkreia44twetuwtqhuwvwo6cbvzyrwtsy5mhn5j2qcw62nxeyi6lt33be',
  'bafkreihidb2duqhq4mic7c3cfdrf7rdqnsxcgxytlxd7hcx7y4uhmrqrse',
  'bafkreib27q5zoijltgknw7gu4u4fgx7ekhyqxxhrmd72sh5fvy27jlgfuu',
  'bafkreifjd7xikezo76puan5jx4dmcp5omjfmjmsyot4wj2bwz7m43nftwq',
  'bafkreiehwy4bfitqemyexuhyi4bgxm5l23qrgny36yprdwv7dabtyftcgi',
  'bafkreieey7jw6iumuin6hzsp7grzedmbixjgjbk2g43mpznnab4kymxjnm',
  'bafkreidl52m67cykm3kzcbgoubl5k3uqtngwpv3nwxjzczqbjkjg7fbgbq',
  'bafkreie3jewrzmlp6uqzirgqi2s67ll64qddv33dohedlo7loqaq7jn47a',
  'bafkreie76k7eik6vhelcbo2xgsmaal4kqzqa2peacegg7mroraepkc3fza',
  'bafkreigvs6cy34donlew3xvaq3uzqw7firb2idwclpvzf6ymawhuq56mla',
  'bafkreigx6who3koayqj6mb4gmgdlfrqqnzoihega53saj245dehzcwyb3y',
  'bafkreif3cvwdzxzeozduxko6fm24tz5auzjubrxb5jawflr2z64eotefum',
  'bafkreig6gm3j7bh2xjlxzjdmqx2czs3vw2vvgowixby7yjgnhqi6yoig34',
  'bafkreihz6nr6m7m7quivrzohjs2rclceejojawjsqn7ulllufhf3j5svrm',
  'bafkreie5xwwbyhdwx2h2zsnvknu5tvnddqkja4vdvsqbntxas6ekvclmge',
  'bafkreihnomqhopvl2beqxydoljudqmuoh6l7ftpu4b642fwzvvohbipwe4',
  'bafkreiad4cpj6i6ezetjpkpr66xmlm62mrndrsf3jkgfhbkbqseij3newm',
  'bafkreic6fvwzvewwpfrlrdhanvgys7a2b4ot2wmaaiht42szd3cvmyc3um',
  'bafkreifi3x32a7qsp7vudiqaj4nd6imebexmsgqafx4vvuxyl6cbeqno5u',
  'bafkreih5m5ujojrjjpzzdy5dqfr4eqfyncayj4mssdor54vhhh6ubmvzr4',
  'bafkreihehidgmlk2tek5lswhqnow4hsxv46xbves73blhrcncsr7537hga',
  'bafkreidlnqpl24pogd4l6jkfiwtknmwdurzke4v2cibfvky2kijfx5u7si',
  'bafkreienpebszkwb4eyffanoxgbnr7fltkvjjgesdfgqlljqspc3uutfsq',
  'bafkreiftdhpg4lbi4nxopesmqblkkgjayoue7htx5sjowjimmznssjmufm',
  'bafkreif33bpkjlk4asue3hfc7lvvhihpfthhoojqabohmizlpo3gs6zuuq',
  'bafkreighwh46gtqiriqdm7uiss2eheuz6i5jl2fribnheh4sovxvsy4rnm',
  'bafkreifhi6wnc25sr7zpcfwowh5a5rzkgeu4ep5qiil4bbh5i4etr6lj54',
  'bafkreia66epc7yx6dfv2tfwksbopep7bvpcqnlvkrqoqr75a5qcdbpmqfu',
  'bafkreibqbnqetgwc6cmkrmyc7q3gt52tnybsjpzll3covkbqp52lzt2vci',
  'bafkreifsmgglzh7rcs25vtvc3ssslp6o6axhjbhqnkweg44xxi3anop6je',
  'bafkreibas4m26mgsgkrz3wiwold4xhjupq6wdgjwpwpqgb67bjskxkk73m',
  'bafkreigydy2mbihan6hjwok424gv6vfre75gab4l65wtil4gggeilsyz3e',
  'bafkreifue2rkw5iglewr4an2tkzgvvo6yk3xgeiaky2kozyd5dnincqcbm',
  'bafkreign352xmsuunb72jtvmv4xtmxwloh3vql42m47wwdrle6qzwuk2kq',
  'bafkreifv42r6sju5a6azztje2wg7cwsxybsooibjyadaeqm5sgl7b5m4sm',
  'bafkreicnmuws3c76gmhz4xsv7bu5x56gwuwmg7gn3emmcwjqcpid4wvooq',
  'bafkreiebybmt3aerj5624xrkavg36z5isxla547h6usgyqeemhcztefoci',
  'bafkreic5djtwfqmjo4izixurezxuchyuyuvnrqy4ygpy2nxhry2rtchji4',
  'bafkreifhmhlj4caa5g2q33l3bwrcnvc54jsf2uwofnqq4kazy5rbndzgra',
  'bafkreidi5td5xvwj2dgffz7o2nvnvedrogid5kgfldkpvk2q7stdoudxhu',
  'bafkreibb7h7bnz3rvcisus5x6vxyz7rga4lh6o5b6ende2qudbyrh34qlu',
  'bafkreifa4zbuz7n6vl5jtuayaselhwychtnkio6r67q5jsot56b4xg2c4u',
  'bafkreia7szl3wykoaex5rq535zvzzt4lr2nn74cxaob2kahvgfcjdqwdjy',
  'bafkreicis3k575ld4a7qbo434zhnie5q2i2s5dyi7tmkvbtd7cffflfx4a',
  'bafkreidq76ujbcw5v3fwvxzbnq34un5oeknafpepnawiy2yqxlqyhxd5k4',
  'bafkreigaw2eiy7afmqvsevizvefmtplhirya6rnf34t4c43eoc6hv2j4li',
  'bafkreia446xiiarsguuynkt5hcxsmj2pwqvu2voqqgyp3cab77bqfysjhe',
  'bafkreicv2swltu3pbi5gwylzob4cn7hlthiovgbaug6irecmyojkjaahay',
  'bafkreidvjoleep6kt33h4kti2tgzb7u2vqwidahhyu6x7blhhsagspbuba',
  'bafkreicjjss4hctr6gctn2ied6hsc5ft5hgdmhb7qc2zq74rqdvom7jpji',
  'bafkreifcwkiydxnvzschpyccuhyrw3rijt4o6wp6tihugl4cqbhedpgtqq',
  'bafkreidvoc2nrtwxr64exi7lavu2rd75np33daeyndqcd6v6kjvbwe3o2e',
  'bafkreiap25hb7g4f3uc3jsjuxoycc4qafjgc4uk6s7zw2qckpnsbp4taxu',
  'bafkreid4djyz37dzdgnuzuejbzy4ngthet3a3ivkpk7qcd6vzoxig2x5xa',
  'bafkreihwmsmowdfntq5tzry72cq4z6mfs4ya5ot65aelniby54minysscu',
  'bafkreiaivicxyj4zanjcvtkn2csw2eyr2zhdu3pk7r7xsdrmgv2yjzfwp4',
  'bafkreidvyaevch6silpmqqd5gmacqdpy3ujwxcsjnbukhitpn6eclfpfse',
  'bafkreicebeagd3i4yxxsoxpfmibq3t6ebx2evab2xlitsqabdzptae6o4m',
  'bafkreids7gwr2igplug6lluxzjmj7l7cy63ckmabhfaciy62zqtw4telyy',
].map((cid) => Link.parse(cid))
