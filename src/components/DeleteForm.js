import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';

export default function DeleteForm(props) {
  const navigate = useNavigate();

  useEffect(() => {
    clearTimeout(props.updateMessageTimeout);
    props.setUpdateMessageTimeout(setTimeout(() => {
      props.setSuccessMessage('');
      props.setErrorMessage('');
    }, 3000));
  }, [props.updateMessage]);

  useEffect(() => {
    busy.current = true;
    getBuildings()
      .then((newBuildings) => {
        if (!newBuildings || newBuildings.length === 0) {
          setLimitReached(true);
        } else {
          let b = [...buildings, ...newBuildings];
          setBuildings(b);
        }
      })
      .catch((error) => {
        setBuildings([]);
      })
      .finally(() => {
        setSearching(false);
        busy.current = false;
        props.setStatus('idle');
      });
    window.addEventListener("scroll", handleScroll);
    return function() {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const [buildings, setBuildings] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const LOAD_TABLE_ROWS = 10;
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(LOAD_TABLE_ROWS);
  const [limitReached, setLimitReached] = useState(false);

  const changeSortParameters = (e, sortParameter) => {
    e.preventDefault();
    if (sortBy === sortParameter) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortDir('asc');
      }
    } else {
      setSortBy(sortParameter);
    }
  };

  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  let update = null;
  const busy = useRef(true);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [forceTextUpdate, setForceTextUpdate] = useState(0);
  const [numberOfBuildings, setNumberOfBuildings] = useState(-1);
  const [forceOutput, setForceOutput] = useState(0);

  useEffect(() => {
    if (limitReached || busy.current) {
      return;
    }
    if (Math.ceil(document.body.scrollHeight) >= Math.ceil(window.innerHeight)) {
      if (buildings.length === 0) {
        setSkip(0);
        setForceOutput(prev => prev + 1);
      }
      return;
    }
    if (buildings.length !== numberOfBuildings) {
      if (buildings.length === 0) {
        setSkip(0);
        setForceOutput(prev => prev + 1);
      } else {
        setSkip(prev => prev + LOAD_TABLE_ROWS);
      }
      setNumberOfBuildings(buildings.length);
    }
  }, [buildings.length, forceUpdate]);

  useEffect(() => {
    if (limitReached || busy.current) {
      return;
    }
    busy.current = true;
    getBuildings()
      .then((newBuildings) => {
        if (!newBuildings || newBuildings.length === 0) {
          setLimitReached(true);
        } else {
          let b = [...buildings, ...newBuildings];
          setBuildings(b);
        }
      })
      .catch((error) => {
        setBuildings([]);
      })
      .finally(() => {
        setSearching(false);
        busy.current = false;
      });
  }, [skip, forceOutput]);

  useEffect(() => {
    setSearching(true);
    setBuildings([]);
    setSkip(0);
    setLimitReached(false);
    setNumberOfBuildings(-1);
    setForceUpdate(prev => prev + 1);
  }, [sortBy, sortDir]);

  const getBuildings = () => {
    return new Promise((resolve, reject) => {
      props.setStatus('loading');
      let httpRequest = new XMLHttpRequest();
      if (!httpRequest) {
        return null;
      }
      if (searchText !== '') {
        httpRequest.open('GET', '/projects/buildings/all/' + sortBy + '/' + sortDir +
        '?skip=' + skip + '&limit=' + limit + '&searchText=' + searchText, true);
      } else {
        httpRequest.open('GET', '/projects/buildings/all/' + sortBy + '/' + sortDir +
        '?skip=' + skip + '&limit=' + limit, true);
      }
      httpRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      httpRequest.send();
      httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
          if (httpRequest.status === 200) {
            let newBuildings = JSON.parse(DOMPurify.sanitize(httpRequest.responseText));
            props.setStatus('idle');
            resolve(newBuildings);
          } else {
            props.setSuccessMessage('');
            props.setErrorMessage('An error occurred while getting the buildings.');
            props.setStatus('idle');
            props.setUpdateMessage(prev => prev + 1);
            reject([]);
          }
        }
      };
    });
  };

  const onDeleteBuilding = (e, id) => {
    e.preventDefault();
    props.setStatus('loading');
    let httpRequest = new XMLHttpRequest();
    if (!httpRequest) {
      return null;
    }
    let data = { id: DOMPurify.sanitize(id), time: DOMPurify.sanitize(props.time) };
    window.grecaptcha.ready(function() {
      window.grecaptcha.execute(DOMPurify.sanitize(props.recaptchaSiteKey), { action: 'delete' })
      .then(function(recaptchaToken) {
        data['g-recaptcha-response'] = DOMPurify.sanitize(recaptchaToken);
        httpRequest.open('POST', '/projects/buildings/delete/add/', true);
        httpRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        httpRequest.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        httpRequest.setRequestHeader('CSRF-Token', DOMPurify.sanitize(props.csrfToken));
        httpRequest.send(JSON.stringify(data));
      })
      .catch(function(error) {
        props.setSuccessMessage('');
        props.setErrorMessage(error);
        props.setStatus('idle');
        props.setUpdateMessage(prev => prev + 1);
      });
    });
    httpRequest.onreadystatechange = function() {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 200) {
          props.setSuccessMessage(JSON.parse(DOMPurify.sanitize(httpRequest.responseText)));
          props.setErrorMessage('');
          props.setStatus('success');
          props.setUpdateMessage(prev => prev + 1);
          navigate("/projects/buildings");
          window.scrollTo(0, 0);
        } else {
          let errors;
          try {
            errors = JSON.parse(DOMPurify.sanitize(httpRequest.responseText));
          } catch (error) {
            errors = null;
          }
          if (Array.isArray(errors)) {
            for (const e of errors) {
              if (e.param === "removeDeletionMessage") {
                props.setErrorMessage(e.msg);
                break;
              } else {
                props.setErrorMessage('An error occurred while deleting the building.');
              }
            }
          } else {
            props.setErrorMessage('An error occurred while deleting the building.');
          }
          props.setSuccessMessage('');
          props.setStatus('idle');
          props.setUpdateMessage(prev => prev + 1);
        }
      }
    };
  };

  let renderedBuildings = buildings.map((building) => {
    return (
      <tr key={ building.id }>
        <td><Link to={ "/projects/buildings/building/" + building.id }>{ building.name }</Link></td>
        <td>{ building.occupancy }</td>
        <td>{ building.type }</td>
        <td>{ building.lastUpdated }</td>
        <td>
          <form>
            <button 
              type="button"
              className="btn btn-sm btn-danger"
              onClick={(e) => onDeleteBuilding(e, building.id)}
            >Delete</button>
          </form>
        </td>
      </tr>
    );
  });

  useEffect(() => {
    setBuildings([]);
    setSkip(0);
    setLimitReached(false);
    setNumberOfBuildings(-1);
    setForceUpdate(prev => prev + 1);
  }, [forceTextUpdate]);

  const handleSearchBarTextChange = (text, valid) => {
    if (valid) {
      setSearchText(text);
      setLimitReached(false);
      props.setUpdateMessage(prev => prev + 1);
      setForceTextUpdate(prev => prev + 1);
      props.setSuccessMessage('');
      props.setErrorMessage('');
      props.setUpdateMessage(prev => prev + 1);
    } else {
      setBuildings([]);
      setLimitReached(true);
      setSearching(false);
      props.setSuccessMessage('');
      props.setErrorMessage('There is an error in the Search Bar.');
      props.setUpdateMessage(prev => prev + 1);
    }
  };

  const handleSearching = (val) => {
    setSearching(val);
  };

  const debounceHandleScroll = () => {
    return function() {
      clearTimeout(update);
      update = setTimeout(function() {
        update = null;
        setSkip(prev => prev + LOAD_TABLE_ROWS);
      }, 1000);
    };
  };

  const handleScroll = () => {
    if (props.status === 'loading' || searching || busy.current) {
      return false;
    }
    let divHeight = Math.ceil(window.pageYOffset + document.getElementById("root").getBoundingClientRect().top) + 
      Math.ceil(document.getElementById("root").scrollHeight);
    if ((Math.ceil(window.innerHeight) + Math.ceil(window.scrollY) >= divHeight) ||
        (Math.ceil(window.innerHeight) + Math.ceil(window.pageYOffset) >= divHeight)) {
      debounceHandleScroll()();
    }
  };

  if (!props.username) {
    props.setErrorMessage('You must be logged in to delete a building.');
    return (
      <React.Fragment>
        <h2 className="mb-4">Delete Building</h2>
        <div className="alert alert-info mt-4 px-4">You must be <a href="/website/account/login" className="link-dark">logged in</a> to delete a building.</div>
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        <h2 className="mb-4">Delete Building</h2>
        <SearchBar
          searchText={searchText}
          onSearchBarTextChange={handleSearchBarTextChange}
          onSearching={handleSearching}
        />
        { !searching &&
          <div className="table-responsive-md">
            <table className="table align-middle mt-4">
              <thead>
                <tr>
                  <th>
                    <a 
                      href="#" 
                      onClick={(e) => changeSortParameters(e, 'name')} 
                      className="link-dark text-decoration-none"
                    >Name</a>
                  </th>
                  <th>
                    <a 
                      href="#" 
                      onClick={(e) => changeSortParameters(e, 'occupancy')} 
                      className="link-dark text-decoration-none"
                    >Occupancy</a>
                  </th>
                  <th>
                    <a 
                      href="#" 
                      onClick={(e) => changeSortParameters(e, 'type')} 
                      className="link-dark text-decoration-none"
                    >Type</a>
                  </th>
                  <th>
                    <a 
                      href="#" 
                      onClick={(e) => changeSortParameters(e, 'lastUpdated')} 
                      className="link-dark text-decoration-none"
                    >Last Updated</a>
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                { renderedBuildings }
              </tbody>
            </table>
          </div>
        }
        { (props.status === 'loading' || searching) && 
          <div class="text-center m-4">
            <div className="spinner-border" role="status">
            </div>
          </div>
        }
      </React.Fragment>
    );
  }
}
