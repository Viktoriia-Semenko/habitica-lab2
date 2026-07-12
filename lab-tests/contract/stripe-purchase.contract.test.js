import Stripe from 'stripe';
import {
  getStripeApi,
  setStripeApi,
} from '../../website/server/libs/payments/stripe/api';
import { generateUser } from '../../test/helpers/api-integration/v3';

const WIREMOCK_URL = 'http://localhost:8080';
const FAKE_SESSION_ID = 'cs_test_fake_session_123';

async function stubStripeCheckoutSession () {
  await fetch(`${WIREMOCK_URL}/__admin/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: {
        method: 'POST',
        urlPath: '/v1/checkout/sessions',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          id: FAKE_SESSION_ID,
          url: 'https://checkout.stripe.com/fake-session',
        },
      },
    }),
  });
}

describe('Stripe purchase contract (via WireMock)', () => {
  let originalStripeApi;

  before(async () => {
    await stubStripeCheckoutSession();

    originalStripeApi = getStripeApi();
    const wiremockStripe = Stripe('sk_test_fake_key', {
      host: 'localhost',
      port: 8080,
      protocol: 'http',
    });
    setStripeApi(wiremockStripe);
  });

  after(() => {
    setStripeApi(originalStripeApi);
  });

  it('returns the session id from Stripe in the documented response shape', async () => {
    const user = await generateUser();

    const res = await user.post('/stripe/checkout-session', { gemsBlock: '21gems' });

    expect(res.sessionId).to.equal(FAKE_SESSION_ID);
  });
});
