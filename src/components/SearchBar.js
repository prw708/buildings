import React, { useState, useEffect } from 'react';

export default function SearchBar(props) {
  const [searchText, setSearchText] = useState('');
  const [textValidity, setTextValidity] = useState(true);
  const [update, setUpdate] = useState(null);

  const validate = (val) => {
    if (/^[A-Za-z0-9 _!.,?"'-]{0,200}$/.test(val)) {
      setTextValidity(true);
      return true;
    } else {
      setTextValidity(false);
      return false;
    }
  };

  const debounceChange = (e) => {
    setSearchText(e.target.value);
    props.onSearching(true);
    return function() {
      clearTimeout(update);
      setUpdate(setTimeout(function() {
        setUpdate(null);
        handleChange(e);
      }, 1000));
    };
  };

  const handleChange = (e) => {
    let valid = validate(e.target.value);
    props.onSearchBarTextChange(e.target.value, valid);
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="mb-4">
        <input 
          type="text"
          className={textValidity ? "form-control" : "form-control is-invalid"}
          autoComplete="off"
          maxLength="200"
          value={searchText}
          onChange={(e) => debounceChange(e)()} 
        />
        { !textValidity && 
          <div className="invalid-feedback">Text can only contain valid characters and must be less than 200 characters.</div>
        }
      </div>
    </form>
  );
}
