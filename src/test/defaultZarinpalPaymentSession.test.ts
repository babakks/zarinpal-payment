import { DefaultZarinpalPaymentSession } from "../src/defaultZarinpalPaymentSession";
import { HttpServiceInvoker } from "../src/http/httpServiceInvoker";
import { ZarinpalServiceConfig } from "../src/zarinpalServiceConfig";
import { PaymentStatus } from "../src/model/paymentStatus";

import { expect } from "chai";
import sinon from "sinon";
import "mocha";

const fakeCallbackUrl = "https://my.domain.com/payment/callback";

// Zarinpal endpoints
const gatewayUrl = "https://www.zarinpal.com/pg/StartPay/";
const verificationAPIEndpoint =
  "https://www.zarinpal.com/pg/rest/WebGate/PaymentVerification.json";
const verificationExtendedAPIEndpoint =
  "https://www.zarinpal.com/pg/rest/WebGate/PaymentVerificationWithExtra.json";
const registrationAPIEndpoint =
  "https://www.zarinpal.com/pg/rest/WebGate/PaymentRequest.json";
const registrationExtendedAPIEndpoint =
  "https://www.zarinpal.com/pg/rest/WebGate/PaymentRequestWithExtra.json";

describe("DefaultZarinpalPaymentSession", () => {
  describe("register()", () => {
    it("should send a `POST` request to the server.", () => {
      const setup = createRegistrationSubject();

      setup.subject.register(fakeCallbackUrl);

      const mockMethod = setup.invoker.invoke as sinon.SinonStub;

      expect(
        mockMethod.calledOnceWith(
          sinon.match(
            value =>
              typeof value === "string" &&
              (value.startsWith(registrationAPIEndpoint) ||
                value.startsWith(registrationExtendedAPIEndpoint))
          ),
          sinon.match("POST")
        )
      ).to.be.true;
    });

    it("should return `undefined`, if the payment was already registered.", async () => {
      const setup = createRegistrationSubject();
      setup.subject.payment.status = PaymentStatus.Registered;

      const value = await setup.subject.register(fakeCallbackUrl);

      expect(value).to.be.undefined;
    });

    it("should call the extended API ('~WithExtra'), if any wage calculation function was defined.", () => {
      const setup = createRegistrationSubject();
      setup.config.wageCalculator = () => {
        return { z1: {}, z2: {} };
      };

      setup.subject.register(fakeCallbackUrl);

      const mockMethod = setup.invoker.invoke as sinon.SinonStub;

      expect(
        mockMethod.calledOnceWith(
          sinon.match(
            value =>
              typeof value === "string" &&
              value.startsWith(registrationExtendedAPIEndpoint)
          )
        )
      ).to.be.true;
    });

    it("should call the extended API ('~WithExtra'), if any custom expiration was defined.", () => {
      const setup = createRegistrationSubject();
      setup.config.expireIn = 1000;

      setup.subject.register(fakeCallbackUrl);

      const mockMethod = setup.invoker.invoke as sinon.SinonStub;

      expect(
        mockMethod.calledOnceWith(
          sinon.match(
            value =>
              typeof value === "string" &&
              value.startsWith(registrationExtendedAPIEndpoint)
          )
        )
      ).to.be.true;
    });
  });

  describe("verify()", () => {
    it("should send a POST request to the server.", () => {
      const setup = createVerificationSubject();

      setup.subject.verify(setup.callbackRequest, undefined);

      const mockMethod = setup.invoker.invoke as sinon.SinonStub;

      expect(
        mockMethod.calledOnceWith(
          sinon.match(
            value =>
              typeof value === "string" &&
              (value.startsWith(verificationAPIEndpoint) ||
                value.startsWith(verificationExtendedAPIEndpoint)),
            "POST"
          )
        )
      ).to.be.true;
    });

    it("should return `undefined`, if the payment was not registered.", async () => {
      const setup = createVerificationSubject();
      setup.subject.payment.status = PaymentStatus.Created;

      const value = await setup.subject.verify(
        setup.callbackRequest,
        undefined
      );

      expect(value).to.be.undefined;
    });

    it("should call the extended API (~'WithExtra'), if any wage calculation function was defined.", () => {
      const setup = createVerificationSubject();
      setup.config.wageCalculator = () => {
        return { z1: {}, z2: {} };
      };

      setup.subject.verify(setup.callbackRequest, undefined);

      const mockMethod = setup.invoker.invoke as sinon.SinonStub;
      expect(
        mockMethod.calledOnceWith(
          sinon.match(
            value =>
              typeof value === "string" &&
              value.startsWith(verificationExtendedAPIEndpoint)
          )
        )
      ).to.be.true;
    });

    it("should call the extended API (~'WithExtra'), if any custom expiration was defined.", () => {
      const setup = createVerificationSubject();
      setup.config.expireIn = 1000;

      setup.subject.verify(setup.callbackRequest, undefined);

      const mockMethod = setup.invoker.invoke as sinon.SinonStub;
      expect(
        mockMethod.calledOnceWith(
          sinon.match(
            value =>
              typeof value === "string" &&
              value.startsWith(verificationExtendedAPIEndpoint)
          )
        )
      ).to.be.true;
    });
  });

  describe("gateway()", () => {
    it("should return a URL with correct beginning.", () => {
      const setup = createRegistrationSubject();

      const value = setup.subject.gateway();

      expect(value.startsWith(gatewayUrl)).to.be.true;
    });
  });
});

export class Setup {
  constructor(
    public config: ZarinpalServiceConfig,
    public subject: DefaultZarinpalPaymentSession,
    public invoker: HttpServiceInvoker,
    public callbackRequest: any
  ) {}
}

export function createVerificationSubject(): Setup {
  const result = createRegistrationSubject();
  result.callbackRequest = {
    url: `${fakeCallbackUrl}?Status=OK&Authority=00000000000000000000987`
  };

  result.subject.payment.status = PaymentStatus.Registered;
  return result;
}

export function createRegistrationSubject(): Setup {
  const config = new ZarinpalServiceConfig(
    "00000000-0000-0000-0000-000000000000",
    undefined,
    undefined
  );

  const fakeInvoker: HttpServiceInvoker = {
    invoke: sinon.stub().returns(
      Promise.resolve({
        Status: "100",
        Authority: "00000000000000000000987",
        RefID: "999999999999"
      })
    )
  };

  const subject = new DefaultZarinpalPaymentSession(config, fakeInvoker);
  subject.payment.amount = 1000;
  subject.payment.description = "Test payment";

  return new Setup(config, subject, fakeInvoker, {});
}
