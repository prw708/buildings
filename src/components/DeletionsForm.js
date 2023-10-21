import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Link, useNavigate } from 'react-router-dom';

export default function DeletionForm(props) {
  const navigate = useNavigate();

  useEffect(() => {
    props.setStatus('idle');
    getBuildings();
  }, []);

  useEffect(() => {
    clearTimeout(props.updateMessageTimeout);
    props.setUpdateMessageTimeout(setTimeout(() => {
      props.setSuccessMessage('');
      props.setErrorMessage('');
    }, 3000));
  }, [props.updateMessage]);

  const [buildings, setBuildings] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

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

  const getBuildings = () => {
    props.setStatus('loading');
    let httpRequest = new XMLHttpRequest();
    if (!httpRequest) {
      return null;
    }
    httpRequest.open('GET', '/projects/buildings/pending-deletions/' + sortBy + '/' + sortDir, true);
    httpRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    httpRequest.send();
    httpRequest.onreadystatechange = function() {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 200) {
          setBuildings(JSON.parse(DOMPurify.sanitize(httpRequest.responseText)));
        } else {
          setBuildings([]);
          props.setSuccessMessage('');
          props.setErrorMessage('An error occurred while getting the pending deletions.');
        }
        props.setStatus('idle');
        props.setUpdateMessage(prev => prev + 1);
      }
    };
  };

  useEffect(() => {
    getBuildings();
  }, [sortBy, sortDir]);

  const onDeleteBuilding = (e, id) => {
    e.preventDefault();
    props.setStatus('loading');
    let httpRequest = new XMLHttpRequest();
    if (!httpRequest) {
      return null;
    }
    let data = { id: DOMPurify.sanitize(id), time: DOMPurify.sanitize(props.time) };
    window.grecaptcha.ready(function() {
      window.grecaptcha.execute(DOMPurify.sanitize(props.recaptchaSiteKey), { action: 'approve' })
      .then(function(recaptchaToken) {
        data['g-recaptcha-response'] = DOMPurify.sanitize(recaptchaToken);
        httpRequest.open('POST', '/projects/buildings/pending-deletions/approve/' + sortBy + '/' + sortDir, true);
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
          setBuildings(JSON.parse(DOMPurify.sanitize(httpRequest.responseText)));
          props.setSuccessMessage('Pending deletion approved successfully!');
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
              if (e.param === "approvePendingDeletionMessage") {
                props.setErrorMessage(e.msg);
                break;
              } else if (e.param === "noPendingDeletionsFoundMessage") {
                props.setErrorMessage(e.msg);
                break;
              } else {
                props.setErrorMessage('An error occurred while approving the pending deletion.');
              }
            }
          } else {
            props.setErrorMessage('An error occurred while approving the pending deletion.');
          }
          props.setSuccessMessage('');
          props.setStatus('idle');
          props.setUpdateMessage(prev => prev + 1);
        }
      }
    };
  };

  const onRemoveBuilding = (e, id) => {
    e.preventDefault();
    props.setStatus('loading');
    let httpRequest = new XMLHttpRequest();
    if (!httpRequest) {
      return null;
    }
    let data = { id: DOMPurify.sanitize(id), time: DOMPurify.sanitize(props.time) };
    window.grecaptcha.ready(function() {
      window.grecaptcha.execute(DOMPurify.sanitize(props.recaptchaSiteKey), { action: 'remove' })
      .then(function(recaptchaToken) {
        data['g-recaptcha-response'] = DOMPurify.sanitize(recaptchaToken);
        httpRequest.open('POST', '/projects/buildings/pending-deletions/remove/' + sortBy + '/' + sortDir, true);
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
          setBuildings(JSON.parse(DOMPurify.sanitize(httpRequest.responseText)));
          props.setSuccessMessage('Pending deletion removed successfully!');
          props.setErrorMessage('');
          props.setStatus('success');
          props.setUpdateMessage(prev => prev + 1);
        } else {
          let errors;
          try {
            errors = JSON.parse(DOMPurify.sanitize(httpRequest.responseText));
          } catch (errors) {
            errors = '';
          }
          if (Array.isArray(errors)) {
            for (const e of errors) {
              if (e.param === "removePendingDeletionMessage") {
                props.setErrorMessage(e.msg);
                break;
              } else if (e.param === "noPendingDeletionsFoundMessage") {
                props.setErrorMessage(e.msg);
                break;
              } else {
                props.setErrorMessage('An error occurred while removing the pending deletion.');
              }
            }
          } else {
            props.setErrorMessage('An error occurred while removing the pending deletion.');
          }
          props.setSuccessMessage('');
          props.setStatus('idle');
          props.setUpdateMessage(prev => prev + 1);
        }
      }
    };
  };

  let renderedBuildings = buildings.map((pendingDeletion) => {
    return (
      <tr key={ pendingDeletion.building.id }>
        <td>
          <Link to={ "/projects/buildings/building/" + pendingDeletion.building.id }>{ pendingDeletion.building.name }</Link>
        </td>
        <td>{ pendingDeletion.building.occupancy }</td>
        <td>{ pendingDeletion.building.type }</td>
        <td>{ pendingDeletion.submittedDate }</td>
        <td>
          { props.admin && 
            <form>
              <button 
                type="button"
                className="btn btn-sm btn-danger me-2 mb-2 mb-md-0"
                onClick={(e) => onDeleteBuilding(e, pendingDeletion.building.id)}
              >Delete</button>
              <button 
                type="button"
                className="btn btn-sm btn-outline-danger me-2 mb-2 mb-md-0"
                onClick={(e) => onRemoveBuilding(e, pendingDeletion.building.id)}
              >Remove</button>
            </form>
          }
          { !props.admin && 
            <small className="mb-0">Admin privileges needed.</small>
          }
        </td>
      </tr>
    );
  });

  if (!props.username) {
    props.setErrorMessage('You must be logged in to view deletion approvals.');
    return (
      <React.Fragment>
        <h2 className="mb-4">Pending Deletions</h2>
        <div className="alert alert-info mt-4 px-4">You must be <a href="/website/account/login" className="link-dark">logged in</a> to view deletion approvals.</div>
      </React.Fragment>
    );
  } else if (props.status === 'loading') {
    return (
      <React.Fragment>
        <div class="text-center m-4">
          <div className="spinner-border" role="status">
          </div>
        </div>
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        <h2 className="mb-4">Pending Deletions</h2>
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
                    onClick={(e) => changeSortParameters(e, 'submittedDate')} 
                    className="link-dark text-decoration-none"
                  >Submitted Date</a>
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              { renderedBuildings }
            </tbody>
          </table>
        </div>
      </React.Fragment>
    );
  }
}
