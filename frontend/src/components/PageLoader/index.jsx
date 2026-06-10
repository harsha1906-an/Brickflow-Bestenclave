import React from 'react';
import './PageLoader.css';

const PageLoader = () => {
  return (
    <div className="centerAbsolute">
      <div className="premium-loader">
        <div className="premium-loader-ring"></div>
        <div className="premium-loader-ring"></div>
        <div className="premium-loader-ring"></div>
        <div className="premium-loader-core"></div>
      </div>
    </div>
  );
};
export default PageLoader;
