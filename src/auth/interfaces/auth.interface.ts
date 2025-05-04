export interface IAuth {
  id: string;
  name: string;
  email: string;
}
export interface IVerifyPayload {
  token: string;
}
export interface IAuthData {
  user: IAuth;
  token: string;
}

export interface IAuthServiceResponse {
  ok: boolean;
  message: string;
  data: IAuthData;
}

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
}
