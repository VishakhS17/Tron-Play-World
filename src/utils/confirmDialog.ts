import Swal from "sweetalert2";

/**
 * Reusable confirmation dialog
 * @param {string} title - Title of the dialog
 * @param {string} text - Message body
 * @param {string} confirmButtonText - Confirm button text
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false otherwise
 */
export const confirmDialog = async (
  title: string,
  text: string,
  confirmButtonText = "Yes, delete it!"
): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText,
  });

  return result.isConfirmed;
};

/* 
 * success dialog
 * @param {string} title - Title of the dialog
*/
export const successDialog = (title: string) => {
  return Swal.fire({
    title,
    icon: "success",
  });
};


/* 
 * error dialog
 * @param {string} title - Title of the dialog
*/
export const errorDialog = (title: string) => {
  return Swal.fire({
    title,
    icon: "error",
  });
};