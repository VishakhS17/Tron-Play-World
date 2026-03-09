"use client";
import React, { useState, useEffect } from "react";

const PreLoader = () => {
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 100);
  }, []);

  return (
    loading && (
      <div className="fixed left-0 top-0 z-999999 flex h-screen w-screen items-center justify-center bg-white">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue border-t-transparent"></div>
      </div>
    )
  );
};

export default PreLoader;
