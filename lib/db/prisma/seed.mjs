import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const challenges = [
  ["11111111-1111-4111-8111-111111111111", "$5K Account", "$5K", 36, false, 1],
  ["22222222-2222-4222-8222-222222222222", "$10K Account", "$10K", 56, false, 2],
  ["33333333-3333-4333-8333-333333333333", "$25K Account", "$25K", 74, false, 3],
  ["44444444-4444-4444-8444-444444444444", "$50K Account", "$50K", 108, false, 4],
  ["55555555-5555-4555-8555-555555555555", "$100K Account", "$100K", 25, true, 5],
];

const faqItems = [
  [
    "What is BLACK Trading?",
    "BLACK Trading offers paid evaluation programs for traders. An evaluation is a simulated trading program; purchasing one does not provide cash or a live brokerage account.",
  ],
  [
    "What is an evaluation?",
    "An evaluation is a simulated trading program with challenge-specific objectives and rules. The complete rules must be available before you purchase.",
  ],
  [
    "How do I purchase a challenge?",
    "Choose a challenge, enter your name, email, and country, then follow the payment instructions shown for an enabled payment method.",
  ],
  [
    "What payment methods are supported?",
    "Only the cryptocurrency and network combinations currently enabled on the payment page are available.",
  ],
  [
    "How do crypto payments work?",
    "Select a listed currency and network, send the displayed amount to the receiving address, and submit the transaction hash. Check the network carefully; blockchain transfers may not be reversible.",
  ],
  [
    "When do I receive my account?",
    "Account details are provided after the payment has been manually reviewed. No delivery time is promised here; contact support if you need an update.",
  ],
  [
    "What happens after payment?",
    "A submitted transaction hash changes the order to payment submitted, not paid. An administrator must verify the transaction before updating the order.",
  ],
  [
    "What are the trading rules?",
    "Challenge-specific objectives, drawdown limits, trading-day requirements, and prohibited strategies must be published before purchase. Review the current challenge terms before paying.",
  ],
  [
    "What happens if I fail?",
    "The evaluation outcome and any next steps are governed by the rules shown for your selected challenge. The applicable account and fee treatment must be stated in the reviewed terms.",
  ],
  [
    "Are refunds available?",
    "Refund eligibility is governed by the final published refund policy. The current legal draft requires review before launch; contact support with an order question.",
  ],
  [
    "How are payouts handled?",
    "Any payout eligibility, calculation, review, and timing must be stated in the applicable program terms. No payout is guaranteed.",
  ],
  [
    "Is this real-money trading or simulated trading?",
    "The evaluation program is simulated trading. Challenge account sizes describe evaluation parameters and are not cash balances or funds deposited for you to trade.",
  ],
  [
    "What countries are supported?",
    "Country eligibility must be confirmed in the final program terms. Please contact support before purchasing if your country is not listed.",
  ],
];

const termsContent = `DRAFT — REQUIRES REVIEW BY A QUALIFIED LAWYER BEFORE LAUNCH

Eligibility
Eligibility requirements and any country restrictions must be reviewed and published before enrollment.

Account rules
Each challenge's allowed instruments, position limits, account access, and operational rules must be stated before purchase.

Evaluation rules
Evaluation objectives, drawdown calculations, minimum trading days, and assessment criteria must be completed for each challenge before launch.

Prohibited trading behavior
The final policy must describe prohibited conduct clearly and explain how it is assessed.

Payment terms
The customer must verify the selected cryptocurrency network and receiving address. Transaction hashes are reviewed manually; submission does not confirm payment.

Refund policy
The applicable refund eligibility, exclusions, and process are not finalized in this draft and require legal review.

Account termination
The grounds, process, and effects of suspension or termination must be finalized in the applicable program terms.

Payout conditions
Any payout eligibility, calculation, review, timing, and dispute process must be explicitly documented. No payout is promised by this draft.

Risk disclosure
Trading involves risk. This evaluation service does not guarantee profits, trading success, or a financial outcome.

Simulated trading disclosure
Evaluation accounts use simulated trading. Displayed account sizes are not cash balances and are not money provided to the customer.

Privacy
Explain what customer information is collected, why it is used, retention periods, and how privacy requests are handled. This section requires review.

Limitation of liability
The final scope and enforceability of any limitation must be determined by qualified counsel before publication.

Contact information
Add the company's verified support contact before launch.

This placeholder is not legal advice and is not ready for use as binding terms.`;

const privacyContent = `DRAFT — REQUIRES REVIEW BY A QUALIFIED LAWYER BEFORE LAUNCH

BLACK Trading collects the information submitted during checkout, including name, email address, country, optional phone number, and payment transaction hash. This draft does not define final retention periods, lawful bases, processors, international transfers, or privacy rights.

Complete and legally review a privacy notice before collecting customer information. Add the verified company identity and support contact before launch.`;

async function seed() {
  for (const [id, displayName, accountSize, price, launchOffer, sortOrder] of challenges) {
    await prisma.challenge.upsert({
      where: { id },
      update: {},
      create: {
        id,
        displayName,
        accountSize,
        price,
        description:
          "A simulated trading evaluation. The challenge size is not cash paid to or held for the customer.",
        rulesSummary:
          "Challenge objectives, loss limits, and trading-day rules must be configured and published before launch.",
        enabled: true,
        launchOffer,
        sortOrder,
      },
    });
  }

  for (const [index, [question, answer]] of faqItems.entries()) {
    const id = `66666666-6666-4666-8666-${String(index + 1).padStart(12, "0")}`;
    await prisma.faq.upsert({
      where: { id },
      update: {},
      create: { id, question, answer, sortOrder: index + 1, published: true },
    });
  }

  await prisma.testimonial.upsert({
    where: { id: "77777777-7777-4777-8777-777777777777" },
    update: {},
    create: {
      id: "77777777-7777-4777-8777-777777777777",
      customerName: "Example trader",
      quote: "Example testimonial — replace with verified customer feedback.",
      verified: false,
      published: true,
      demo: true,
    },
  });

  const mediaItems = [
    ["88888888-8888-4888-8888-888888888881", "Trader story demo", "story"],
    ["88888888-8888-4888-8888-888888888882", "Market update demo", "announcement"],
    ["88888888-8888-4888-8888-888888888883", "Trading screenshot demo", "screenshot"],
  ];
  for (const [index, [id, title, kind]] of mediaItems.entries()) {
    await prisma.mediaItem.upsert({
      where: { id },
      update: {},
      create: {
        id,
        title,
        kind,
        caption: "Demo content — replace with approved, verified material.",
        assetUrl: null,
        published: true,
        demo: true,
        sortOrder: index + 1,
      },
    });
  }

  const statistics = [
    ["99999999-9999-4999-8999-999999999991", "Customers", "10,000+"],
    ["99999999-9999-4999-8999-999999999992", "Challenges purchased", "Add verified total"],
    ["99999999-9999-4999-8999-999999999993", "Countries served", "Add verified total"],
  ];
  for (const [index, [id, label, value]] of statistics.entries()) {
    await prisma.siteStatistic.upsert({
      where: { id },
      update: {},
      create: {
        id,
        label,
        value,
        verified: false,
        visible: false,
        sortOrder: index + 1,
      },
    });
  }

  await prisma.siteSetting.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      companyName: "BLACK Trading",
      logoText: "BLACK Trading",
      supportEmail: "",
      socialLinks: [],
      termsContent,
      privacyContent,
    },
  });
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
