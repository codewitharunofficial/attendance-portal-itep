module.exports = {
  experimental: {
    serverComponentsExternalPackages: ["mongoose", "exceljs"],
    // Make sure the bundled bill template ships with the serverless functions that read it.
    outputFileTracingIncludes: { "/api/**/*": ["./assets/**"] },
  },
};
