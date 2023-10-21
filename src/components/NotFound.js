import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NotFound(props) {
  return (
    <React.Fragment>
      <h2 className="mb-0">Not Found</h2>
      <div className="mt-4">
        <Link to={"/projects/buildings"} className="link-dark">Return</Link>
      </div>
    </React.Fragment>
  );
}
