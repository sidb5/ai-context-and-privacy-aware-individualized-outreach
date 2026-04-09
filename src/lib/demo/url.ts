export function buildSessionUrl(params: {
  asset: string;
  source: string;
  channel: string;
  st: string;
  issue?: string;
  geo?: string;
  timing?: string;
  tier?: string;
  smsMode?: string;
  smsNotice?: string;
}) {
  const searchParams = new URLSearchParams({
    asset: params.asset,
    source: params.source,
    channel: params.channel,
    st: params.st,
  });

  if (params.issue) {
    searchParams.set("issue", params.issue);
  }

  if (params.geo) {
    searchParams.set("geo", params.geo);
  }

  if (params.timing) {
    searchParams.set("timing", params.timing);
  }

  if (params.tier) {
    searchParams.set("tier", params.tier);
  }

  if (params.smsMode) {
    searchParams.set("smsMode", params.smsMode);
  }

  if (params.smsNotice) {
    searchParams.set("smsNotice", params.smsNotice);
  }

  return `/?${searchParams.toString()}`;
}
