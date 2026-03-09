export interface IGenericErrorMessage {
  field?: string;
  message: string;
}

export type IGenericErrorResponse = {
  statusCode: number;
  message: string;
  errorMessages?: IGenericErrorMessage[];
};

export type IGenericSuccessResponse<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
};
