const puppeteer = require("puppeteer");

const toTestId = (id) => `[data-testid="${id}"]`;

const emailAddress = toTestId("login-form-email");
const password = toTestId("login-form-password");
const signIn = toTestId("login-form-sign-in");
const addTreatmentButton = toTestId("editor-treatments-add");
const envSelect = ".environment-dropdown__select";

const defaultDelayOption = {
  delay: 5,
};

const waitForSelectorOption = {
  visible: true,
};

const automationInput = {
  emailAddress: "{{ login email address }}",
  password: "{{ password }}",
  ftUrl: "{{ split url for the page to be copied to }}",
};

(async () => {
  const browser = await puppeteer.launch({ headless: false, devtools: false });
  const context = browser.defaultBrowserContext();
  await context.overridePermissions("https://app.split.io", [
    "clipboard-read",
    "clipboard-write",
  ]);
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 768});
  await page.goto(automationInput.ftUrl, {
    waitUntil: "domcontentloaded",
  });

  /// login
  await page.waitForSelector(emailAddress, waitForSelectorOption);
  await page.type(
    emailAddress,
    automationInput.emailAddress,
    defaultDelayOption
  );
  await page.type(password, automationInput.password, defaultDelayOption);
  await page.click(signIn);

  /// start pasting config

  await page.waitForSelector(
    ".empty-section-container__button",
    waitForSelectorOption
  );
  await page.click(".empty-section-container__button");
  await page.waitForSelector(addTreatmentButton, waitForSelectorOption);
  
  await page.click(envSelect);

  page.on('dialog', async dialog => {
    await dialog.accept();
	});

  await page.evaluate(async (envOption) => {
      const envFoundOption = Array.from(
        document.querySelectorAll(".environment-dropdown__option-environment-label")
      ).filter((el) => el.textContent.toLowerCase() === envOption.toLowerCase());
      envFoundOption[0].click();
    }
  , "Dev-Next");

  await page.waitForSelector(
    ".empty-section-container__button",
    waitForSelectorOption
  );
  await page.click(".empty-section-container__button");
  await page.waitForSelector(addTreatmentButton, waitForSelectorOption);

  await page.waitForSelector(
    toTestId("define-treatments-name"),
    waitForSelectorOption
  );
  await page.waitForSelector(
    toTestId("define-treatments-description"),
    waitForSelectorOption
  );

  const countryBasedMatchingCriteria = [
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".com",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".co.uk",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".at",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".be",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".ca",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".ch",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".de",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".es",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".fr",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".ie",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".it",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".lu",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".nl",
      treatmentOptionName: "off",
    },
    {
      input: "domain",
      matchingCriteria: "matches",
      matchingChoose: ".se",
      treatmentOptionName: "off",
    },
  ];

  for (i = 0; i < countryBasedMatchingCriteria.length; i++) {
    await page.click(toTestId("targeting-rules-add-rule"));
  }

  await page.evaluate(async () => {
    const editorInputs = document.querySelectorAll(
      '[data-testId="targeting-rules-attribute"]'
    );
    await editorInputs.forEach(async (ei, idx) => {
      await ei.setAttribute("data-testid", `targeting-rules-attribute-${idx}`);
    });
  });

  for (i = 0; i < countryBasedMatchingCriteria.length; i++) {
    await page.type(
      toTestId(`targeting-rules-attribute-${i}`),
      countryBasedMatchingCriteria[i].input
    );
  }

  await page.evaluate(async (_countryBasedMatchingCriteria) => {
    _countryBasedMatchingCriteria.forEach((fpm, idx) => {
      const editorMatchingCriterias = Array.from(
        document.querySelectorAll("a")
      ).filter((el) => el.textContent === fpm.matchingCriteria);
      editorMatchingCriterias[idx].click();
    });
  }, countryBasedMatchingCriteria);

  await page.evaluate(async () => {
    const editorRulesChooser = document.querySelectorAll(".chooser input");
    await editorRulesChooser.forEach(async (erc, idx) => {
      await erc.setAttribute("data-testid", `targeting-rules-chooser-${idx}`);
    });
  });

  for (i = 0; i < countryBasedMatchingCriteria.length; i++) {
    await page.type(
      toTestId(`targeting-rules-chooser-${i}`),
      countryBasedMatchingCriteria[i].matchingChoose
    );
  }

  await page.evaluate(async () => {
    const allocationContents = document.querySelectorAll(
      ".editor__treatments-allocation__content"
    );
    await allocationContents.forEach(async (ei, idx) => {
      await ei.setAttribute(
        "data-testid",
        `treatments-allocation__content-${idx}`
      );
    });
  });

  for (i = 0; i < countryBasedMatchingCriteria.length; i++) {
    await page.click(toTestId(`treatments-allocation__content-${i}`));

    await page.evaluate(async (_pageMatching) => {
      await Array.from(
        document.querySelectorAll(".editor__treatment-option__name")
      )
        .filter((el) => el.textContent === _pageMatching.treatmentOptionName)[0]
        .click();
    }, countryBasedMatchingCriteria[i]);
  }
})();
