/**
 * Hyderabad localities and approximate centre points. Reports are mapped to a
 * locality only, never an exact location (DPDP Act: data minimisation).
 */
export const LOCALITIES: Record<string, [number, number]> = {
  Kukatpally: [17.4849, 78.4138],
  KPHB: [17.4936, 78.3996],
  Ameerpet: [17.4375, 78.4482],
  Secunderabad: [17.4399, 78.4983],
  'Banjara Hills': [17.4156, 78.4347],
  'Jubilee Hills': [17.4326, 78.4071],
  Madhapur: [17.4483, 78.3915],
  Gachibowli: [17.4401, 78.3489],
  Kondapur: [17.4691, 78.3578],
  Miyapur: [17.4968, 78.3614],
  Dilsukhnagar: [17.3688, 78.5247],
  'LB Nagar': [17.3457, 78.5522],
  Uppal: [17.4058, 78.5591],
  Malkajgiri: [17.45, 78.53],
  Tarnaka: [17.4281, 78.5395],
  Mehdipatnam: [17.395, 78.4392],
  Begumpet: [17.4447, 78.4664],
  Himayatnagar: [17.4022, 78.4867],
  Charminar: [17.3616, 78.4747],
  Abids: [17.3924, 78.4752],
  Kompally: [17.5357, 78.4859],
  Manikonda: [17.405, 78.386],
  Attapur: [17.37, 78.43],
  Alwal: [17.5047, 78.5124],
  ECIL: [17.4704, 78.5718],
};

export const HYDERABAD: [number, number] = [17.385, 78.4867];

/** "Kukatpally, Hyderabad" -> Kukatpally and its centre. Unknown places map to the city centre. */
export function locate(locality: string | null | undefined): { locality: string; lat: number; lng: number } {
  const name = (locality ?? '').split(',')[0]!.trim();
  const key = Object.keys(LOCALITIES).find((k) => k.toLowerCase() === name.toLowerCase());
  const [lat, lng] = key ? LOCALITIES[key]! : HYDERABAD;
  return { locality: key ?? (name || 'Hyderabad'), lat, lng };
}
