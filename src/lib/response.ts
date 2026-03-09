
// Generic error message interface (assuming this exists elsewhere)
interface IGenericErrorMessage {
  path: string;
  message: string;
}

// Error response type
interface ErrorResponse {
  statusCode: number;
  success: false;
  message: string;
  errorMessages: IGenericErrorMessage[];
}

// Success response type
interface SuccessResponse<T> {
  statusCode: number;
  success: true;
  message: string;
  data?: T;
}

// Update errorResponse function
export const errorResponse = (
  statusCode: number,
  message: string,
  errorMessages?: IGenericErrorMessage[]
): ErrorResponse => {
  return {
    statusCode,
    success: false,
    message,
    errorMessages: errorMessages || [],
  };
};

// Update successResponse function
export const successResponse = <T>(
  statusCode: number,
  message: string,
  data?: T
): SuccessResponse<T> => {
  return {
    statusCode,
    success: true,
    message,
    data,
  };
};