import 'mocha'

import { assert } from 'chai'
import * as request from 'supertest'

import App from '../../../../src/app'
import HttpStatus from '../../../../src/types/httpStatus'
import { appSetup, appCleanup } from '../../../helpers/helpers'

let app: App

const XRPL_TESTNET_ACCEPT_HEADER = 'application/xrpl-testnet+json'
const XRPL_MAINNET_ACCEPT_HEADER = 'application/xrpl-mainnet+json'

describe('E2E - publicAPIRouter - Content Negotiation', function (): void {
  // Boot up Express application and initialize DB connection pool
  before(async function () {
    app = await appSetup()
  })

  it('Returns the first address for multiple types with no q', function (done): void {
    // GIVEN a payment pointer known to have an associated xrpl-testnet and xrpl-mainnet address
    const payId = '/alice'
    const acceptHeader = `${XRPL_TESTNET_ACCEPT_HEADER}, ${XRPL_MAINNET_ACCEPT_HEADER}`
    const expectedResponse = {
      addressDetailType: 'CryptoAddressDetails',
      addressDetails: {
        address: 'TVacixsWrqyWCr98eTYP7FSzE9NwupESR4TrnijN7fccNiS',
      },
    }

    // WHEN we make a GET request to the public endpoint to retrieve payment info with an Accept header specifying
    // both testnet and mainnet, with no q for either
    request(app.publicAPIExpress)
      .get(payId)
      .set('Accept', acceptHeader)
      // THEN we get back an xrpl testnet header as our Content-Type
      .expect((res) => {
        assert.strictEqual(
          res.get('Content-Type').split('; ')[0],
          XRPL_TESTNET_ACCEPT_HEADER,
        )
      })
      // AND we get back the xrpl-testnet account information associated with that payment pointer for xrpl-testnet
      .expect(HttpStatus.OK, expectedResponse, done)
  })

  it('Returns the preferred available address where the higher q is at the beginning', function (done): void {
    // GIVEN a payment pointer known to have an associated xrpl-testnet address and xrpl-mainnet address
    const payId = '/alice'
    const acceptHeader = `${XRPL_TESTNET_ACCEPT_HEADER}; q=1.0, ${XRPL_MAINNET_ACCEPT_HEADER}; q=0.5`
    const expectedResponse = {
      addressDetailType: 'CryptoAddressDetails',
      addressDetails: {
        address: 'TVacixsWrqyWCr98eTYP7FSzE9NwupESR4TrnijN7fccNiS',
      },
    }

    // WHEN we make a GET request to the public endpoint to retrieve payment info with an Accept header specifying testnet
    // and mainnet, with testnet having a higher q-value
    request(app.publicAPIExpress)
      .get(payId)
      .set('Accept', acceptHeader)
      // THEN we get back an xrpl testnet header as the Content-Type
      .expect((res) => {
        assert.strictEqual(
          res.get('Content-Type').split('; ')[0],
          XRPL_TESTNET_ACCEPT_HEADER,
        )
      })
      // AND we get back the xrpl testnet account information associated with that payment pointer for xrpl testnet
      .expect(HttpStatus.OK, expectedResponse, done)
  })

  it('Returns the preferred available address where the higher q is at the end', function (done): void {
    // GIVEN a payment pointer known to have an associated xrpl-testnet address and an xrpl-mainnet address
    const payId = '/alice'
    const acceptHeader = `${XRPL_TESTNET_ACCEPT_HEADER}; q=0.5, ${XRPL_MAINNET_ACCEPT_HEADER}; q=1.0`
    const expectedResponse = {
      addressDetailType: 'CryptoAddressDetails',
      addressDetails: {
        address: 'X7zmKiqEhMznSXgj9cirEnD5sWo3iZSbeFRexSFN1xZ8Ktn',
      },
    }

    // WHEN we make a GET request to the public endpoint to retrieve payment info with an Accept header specifying
    // xrpl-testnet and xrpl-mainnet, with a higher q for xrpl-mainnet
    request(app.publicAPIExpress)
      .get(payId)
      .set('Accept', acceptHeader)
      // THEN we get back a xrpl-mainnet accept header as the Content-Type
      .expect((res) => {
        assert.strictEqual(
          res.get('Content-Type').split('; ')[0],
          XRPL_MAINNET_ACCEPT_HEADER,
        )
      })
      // AND we get back the xrpl-mainnet account information associated with that payment pointer for xrpl-mainnet.
      .expect(HttpStatus.OK, expectedResponse, done)
  })

  it('Returns a valid address when the most preferred type does not exist', function (done): void {
    // GIVEN a payment pointer known to have an associated xrpl-testnet address and mainnet address
    const payId = '/alice'
    const nonExistentAcceptType = 'application/fakenetwork-fakenet+json'
    const acceptHeader = `${nonExistentAcceptType}; q=1.0, ${XRPL_TESTNET_ACCEPT_HEADER}; q=0.5, ${XRPL_MAINNET_ACCEPT_HEADER}; q=0.9`
    const expectedResponse = {
      addressDetailType: 'CryptoAddressDetails',
      addressDetails: {
        address: 'X7zmKiqEhMznSXgj9cirEnD5sWo3iZSbeFRexSFN1xZ8Ktn',
      },
    }

    // WHEN we make a GET request to the public endpoint to retrieve payment info with an Accept header specifying
    // a non-existent network+environment most preferred, followed by xrpl-mainnet and xrpl-testnet
    request(app.publicAPIExpress)
      .get(payId)
      .set('Accept', acceptHeader)
      // THEN we get back a xrpl-mainnet accept header as the Content-Type
      .expect((res) => {
        assert.strictEqual(
          res.get('Content-Type').split('; ')[0],
          XRPL_MAINNET_ACCEPT_HEADER,
        )
      })
      // AND we get back the xrpl-mainnet account information associated with that payment pointer for xrpl mainnet.
      .expect(HttpStatus.OK, expectedResponse, done)
  })

  // Shut down Express application and close DB connections
  after(function () {
    appCleanup(app)
  })
})