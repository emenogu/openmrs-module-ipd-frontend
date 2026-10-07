// mock the fetch global using jest
require("jest-fetch-mock").enableMocks();

// mock out i18n module with __mock__ based files
jest.mock("./features/i18n/utils");


// Upstream Bundle-1 components use useIntl(); keep legacy tests provider-agnostic.
jest.mock("react-intl", () => {
  const actual = jest.requireActual("react-intl");
  return {
    ...actual,
    useIntl: () => ({
      formatMessage: ({ id, defaultMessage }) => defaultMessage || id,
    }),
  };
});


// jsdom on the pinned Node/Jest stack does not provide randomUUID.
if (!global.crypto) global.crypto = {};
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = jest.fn(() => "00000000-0000-4000-8000-000000000000");
}
