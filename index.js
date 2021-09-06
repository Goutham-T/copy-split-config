const puppeteer = require("puppeteer");

const toTestId = (id) => `[data-testid="${id}"]`;

const emailAddress = toTestId("login-form-email");
const password = toTestId("login-form-password");
const signIn = toTestId("login-form-sign-in");
const addTreatmentButton = toTestId("editor-treatments-add");

const defaultDelayOption = {
  delay: 5,
};

const waitForSelectorOption = {
  visible: true,
};

const automationInput = {
  emailAddress: "{{ login email address }}",
  password: "{{ password }}",
  fromPageUrl:
    "{{ split url for the page to be copied from }}",
  toPageUrl:
    "{{ split url for the page to be copied to }}",
};

(async () => {
  const browser = await puppeteer.launch({ headless: false, devtools: false });
  const context = browser.defaultBrowserContext();
  await context.overridePermissions("https://app.split.io", [
    "clipboard-read",
    "clipboard-write",
  ]);
  const frompage = await browser.newPage();
  await frompage.goto(automationInput.fromPageUrl, {
    waitUntil: "domcontentloaded",
  });

  /// login
  await frompage.waitForSelector(emailAddress, waitForSelectorOption);
  await frompage.type(
    emailAddress,
    automationInput.emailAddress,
    defaultDelayOption
  );
  await frompage.type(password, automationInput.password, defaultDelayOption);
  await frompage.click(signIn);

  // get data from source page
  const fetchTreatmentResponse = await frompage.waitForResponse((response) => {
    const nwUrl = response.url();
    return (
      nwUrl.includes("https://app.split.io/internal/api/tests/") &&
      nwUrl.split("/").length === 7 &&
      response.status() === 200
    );
  });
  const fromPageData = await fetchTreatmentResponse.json();
  const fromPageTreatments = fromPageData.treatments;

  /// start pasting config
  const toPage = await browser.newPage();
  await toPage.goto(automationInput.toPageUrl, {
    waitUntil: "domcontentloaded",
  });

  await toPage.waitForSelector(
    ".empty-section-container__button",
    waitForSelectorOption
  );
  await toPage.click(".empty-section-container__button");
  await toPage.waitForSelector(addTreatmentButton, waitForSelectorOption);
  await toPage.waitForSelector(
    toTestId("define-treatments-name"),
    waitForSelectorOption
  );
  await toPage.waitForSelector(
    toTestId("define-treatments-description"),
    waitForSelectorOption
  );

  await fromPageTreatments.forEach(async (_, idx) => {
    await toPage.evaluate(async (_idx) => {
      if (_idx > 1) {
        document.querySelector(`[data-testid="editor-treatments-add"]`).click();
      }
      const toPageTreatmentNames = document.querySelectorAll(
        `[data-testid="define-treatments-name"]`
      );
      const toPageDescTreatments = document.querySelectorAll(
        `[data-testid="define-treatments-description"]`
      );
      const treatmentName =
        toPageTreatmentNames[_idx].getElementsByTagName("input")[0];
      const treatmentDesc =
        toPageDescTreatments[_idx].getElementsByTagName("input")[0];

      await treatmentName.setAttribute(
        "data-testid",
        `define-treatments-name-${_idx}`
      );
      await treatmentDesc.setAttribute(
        "data-testid",
        `define-treatments-description-${_idx}`
      );
    }, idx);
  });

  for (i = 0; i < fromPageTreatments.length; i++) {
    await toPage.cl;

    const input = await toPage.$(toTestId(`define-treatments-name-${i}`));
    await input.click({ clickCount: 3 })
    await input.type(fromPageTreatments[i].name);

    const inputDesc = await toPage.$(toTestId(`define-treatments-description-${i}`));
    await inputDesc.click({ clickCount: 3 })
    await inputDesc.type(fromPageTreatments[i].description);
  }

  await toPage.evaluate(async () => {
    document.querySelectorAll(`[data-tid="collapsible-toggle"]`)[1].click();
    const selector = document.querySelectorAll(".testcssid-select__control")[2];
    await selector.setAttribute("data-testid", `add-treatments-selector`);
  });

  await toPage.click(toTestId("add-treatments-selector"));
  await toPage.waitForSelector(
    ".testcssid-select__menu",
    waitForSelectorOption
  );
  await toPage.evaluate(async () => {
    const selectOptions = document.querySelector(".testcssid-select__menu");

    const ops = selectOptions.getElementsByClassName(
      "testcssid-select__option"
    );
    ops[0].click();
  });

  await toPage.waitForSelector(".json-editor-container", waitForSelectorOption);

  await toPage.evaluate(async () => {
    const treatmentEditors = document.querySelectorAll(
      `.json-editor-container`
    );
    await treatmentEditors.forEach(async (te, _idx) => {
      await te.setAttribute("data-testid", `define-treatments-editor-${_idx}`);
    });
  });

  for (i = 0; i < fromPageTreatments.length; i++) {
    const configurations = JSON.stringify(
      JSON.parse(fromPageTreatments[i].configurations)
    );
    await toPage.click(toTestId(`define-treatments-editor-${i}`));
    await toPage.type(
      toTestId(`define-treatments-editor-${i}`),
      configurations
    );
  }

  const fromPageMatchings = await frompage.evaluate(async () => {
    const editorInputs = document.querySelectorAll(
      '[data-testId="targeting-rules-attribute"]'
    );
    const editorMatchingCriterias = document.querySelectorAll(
      '[data-testId="editor-matcher-value"]'
    );
    const editorMatchingChooses = document.querySelectorAll(".chooser input");
    const treatmentOptionNames = document.querySelectorAll(
      ".editor__treatment-option__name"
    );
    return [...editorInputs].map((ei, idx) => ({
      input: ei.value,
      matchingCriteria: editorMatchingCriterias[idx].textContent,
      matchingChoose: editorMatchingChooses[idx].value,
      treatmentOptionName: treatmentOptionNames[idx].textContent,
    }));
  });

  for (i = 0; i < fromPageMatchings.length; i++) {
    await toPage.click(toTestId("targeting-rules-add-rule"));
  }

  await toPage.evaluate(async () => {
    const editorInputs = document.querySelectorAll(
      '[data-testId="targeting-rules-attribute"]'
    );
    await editorInputs.forEach(async (ei, idx) => {
      await ei.setAttribute("data-testid", `targeting-rules-attribute-${idx}`);
    });
  });

  for (i = 0; i < fromPageMatchings.length; i++) {
    await toPage.type(
      toTestId(`targeting-rules-attribute-${i}`),
      fromPageMatchings[i].input
    );
  }

  await toPage.evaluate(async (_fromPageMatchings) => {
    _fromPageMatchings.forEach((fpm, idx) => {
      const editorMatchingCriterias = Array.from(
        document.querySelectorAll("a")
      ).filter((el) => el.textContent === fpm.matchingCriteria);
      editorMatchingCriterias[idx].click();
    });
  }, fromPageMatchings);

  await toPage.evaluate(async () => {
    const editorRulesChooser = document.querySelectorAll(".chooser input");
    await editorRulesChooser.forEach(async (erc, idx) => {
      await erc.setAttribute("data-testid", `targeting-rules-chooser-${idx}`);
    });
  });

  for (i = 0; i < fromPageMatchings.length; i++) {
    await toPage.type(
      toTestId(`targeting-rules-chooser-${i}`),
      fromPageMatchings[i].matchingChoose
    );
  }

  await toPage.evaluate(async () => {
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

  for (i = 0; i < fromPageMatchings.length; i++) {
    await toPage.click(toTestId(`treatments-allocation__content-${i}`));

    await toPage.evaluate(async (_fromPageMatching) => {
      await Array.from(
        document.querySelectorAll(".editor__treatment-option__name")
      )
        .filter(
          (el) => el.textContent === _fromPageMatching.treatmentOptionName
        )[0]
        .click();
    }, fromPageMatchings[i]);
  }

  const defaultRule = await frompage.evaluate(
    () =>
      document.querySelector(".editor__treatments-allocation__content")
        .innerText
  );
  await toPage.click(".editor__treatments-allocation__content");
  await toPage.evaluate(async (_defaultRule) => {
    await Array.from(
      document.querySelectorAll(".editor__treatment-option__name")
    )
      .filter((el) => el.textContent === _defaultRule)[0]
      .click();
  }, defaultRule);

  const defaultTreatment = await frompage.evaluate(
    () => document.querySelector(".editor__default-treatment__select").innerText
  );
  await toPage.click(".editor__default-treatment__select");
  await toPage.evaluate(async (_defaultTreatment) => {
     Array.from(
      document.querySelectorAll(".editor__default-treatment__select .editor__treatment-option__name")
    )
      .filter((el) => el.textContent === _defaultTreatment)[0]
      .click();
  }, defaultTreatment);
})();
