/** Accept only an explicit 'not found' as the absence of Resend suppression. */
export function normalizeEligibilityResponse(httpStatus: number): {eligible:boolean;suppressed:boolean}|null {
  if (httpStatus === 404) return {eligible:true,suppressed:false};
  if (httpStatus === 200) return {eligible:false,suppressed:true};
  return null;
}
