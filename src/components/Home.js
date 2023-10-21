import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';

export default function Home(props) {
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
        busy.current = false;
        setSearching(false);
      });
    window.addEventListener("scroll", handleScroll);
    return function() {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const [buildings, setBuildings] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const CARDS_PER_ROW = 4;
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(CARDS_PER_ROW);
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
        setSkip(prev => prev + CARDS_PER_ROW);
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
        '?skip=' + skip + '&limit=' + limit + '&searchText=' + searchText, 
        true);
      } else {
        httpRequest.open('GET', '/projects/buildings/all/' + sortBy + '/' + sortDir + 
        '?skip=' + skip + '&limit=' + limit, 
        true);
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

  let renderedBuildings = buildings.map((building) => {
    return (
      <div className="col" key={ building.id }>
        <div className="card h-100 position-relative">
          <img 
            className="card-img-top w-100 h-auto flex-shrink-0" 
            src={ building.image ? 
                  "data:image/png;base64," + building.image :
                  "/projects/buildings/static/images/building_image.png" } 
          />
          <div className="card-body">
            <h5 className="card-title mb-3">{ building.name }</h5>
            <small className="card-subtitle mb-0">Occupancy: { building.occupancy }</small>
          </div>
          <div className="card-footer bg-white">
            <Link 
              className="card-link link-secondary text-decoration-none"
              to={ "/projects/buildings/building/" + building.id }
            >View Details</Link>
          </div>
        </div>
      </div>
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
  }

  const debounceHandleScroll = () => {
    return function() {
      clearTimeout(update);
      update = setTimeout(function() {
        update = null;
        setSkip(prev => prev + CARDS_PER_ROW);
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

  return (
    <React.Fragment>
      <SearchBar 
        searchText={searchText} 
        onSearchBarTextChange={handleSearchBarTextChange} 
        onSearching={handleSearching}
      />
      <div className="d-flex flex-column flex-md-row align-items-md-center mt-2 mb-4">
        <span className="d-block d-md-inline p-0 mb-2 mb-md-0 me-md-4">Order By</span>
        <a 
          href="#" 
          onClick={(e) => changeSortParameters(e, 'name')} 
          className="small link-dark text-decoration-none d-block d-md-inline p-0 mb-1 mb-md-0 ms-md-4"
        >Name</a>
        <a 
          href="#" 
          onClick={(e) => changeSortParameters(e, 'occupancy')} 
          className="small link-dark text-decoration-none d-block d-md-inline p-0 mb-1 mb-md-0 ms-md-4"
        >Occupancy</a>
        <a 
          href="#" 
          onClick={(e) => changeSortParameters(e, 'type')} 
          className="small link-dark text-decoration-none d-block d-md-inline p-0 mb-1 mb-md-0 ms-md-4"
        >Type</a>
        <a 
          href="#" 
          onClick={(e) => changeSortParameters(e, 'lastUpdated')} 
          className="small link-dark text-decoration-none d-block d-md-inline p-0 mb-1 mb-md-0 ms-md-4"
        >Last Updated</a>
      </div>
      { ((!buildings || buildings.length === 0) && !searching && props.status !== 'loading') && 
        <p>No buildings to show.</p>
      }
      { !searching &&
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
          { renderedBuildings }
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
