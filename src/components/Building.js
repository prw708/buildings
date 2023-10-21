import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useParams, Link, useNavigate } from 'react-router-dom';

export default function Building(props) {
  let params = useParams();
  const navigate = useNavigate();

  const [building, setBuilding] = useState({});

  useEffect(() => {
    getBuilding();
  }, []);

  useEffect(() => {
    clearTimeout(props.updateMessageTimeout);
    props.setUpdateMessageTimeout(setTimeout(() => {
      props.setSuccessMessage('');
      props.setErrorMessage('');
    }, 3000));
  }, [props.updateMessage]);

  const getBuilding = () => {
    props.setStatus('loading');
    let httpRequest = new XMLHttpRequest();
    if (!httpRequest) {
      return null;
    }
    httpRequest.open('GET', '/projects/buildings/get/' + params.buildingId, true);
    httpRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    httpRequest.send();
    httpRequest.onreadystatechange = function() {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 200) {
          setBuilding(JSON.parse(DOMPurify.sanitize(httpRequest.responseText)));
        } else {
          setBuilding(null);
          props.setSuccessMessage('');
          props.setErrorMessage('An error occurred while getting the building.');
        }
        props.setStatus('idle');
        props.setUpdateMessage(prev => prev + 1);
      }
    };
  };

  const getBuildingType = () => {
    switch (building.type) {
      case "R-$":
        return "Low-Wealth Residential";
      case "R-$$":
        return "Medium-Wealth Residential";
      case "R-$$$":
        return "High-Wealth Residential";
      case "CS-$":
        return "Low-Wealth Commercial Service";
      case "CS-$$":
        return "Medium-Wealth Commercial Service";
      case "CS-$$$":
        return "High-Wealth Commercial Service";
      case "CO-$$":
        return "Medium-Wealth Commercial Office";
      case "CO-$$$":
        return "High-Wealth Commercial Office";
      case "I-AG":
        return "Industrial - Agriculture";
      case "I-D":
        return "Industrial - Dirty";
      case "I-M":
        return "Industrial - Manufacturing";
      case "I-HT":
        return "Industrial - High Tech";
      default:
        return "";
    }
  }

  const onDeleteClick = (e) => {
    e.preventDefault();
    props.setStatus('loading');
    let httpRequest = new XMLHttpRequest();
    if (!httpRequest) {
      return null;
    }
    let data = { id: DOMPurify.sanitize(building.id), time: DOMPurify.sanitize(props.time) };
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
    }
  };

  if (props.status === 'loading') {
    return (
      <div class="text-center m-4">
        <span className="spinner-border" role="status">
        </span>
      </div>
    );
  } else {
    if (!building) {
      return (
        <React.Fragment>
          <h2 className="mb-4">Building</h2>
          <p className="mt-4">Building not found.</p>
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment>
          <div className="row g-0 mb-4">
            <div className="col-8 col-sm-9">
              <h2 className="mb-0">Building</h2>
            </div>
            <div className="col-4 col-sm-3 d-flex align-items-end flex-row-reverse">
              <form>
                <Link
                  className="btn btn-link link-dark m-0 p-0 ms-3"
                  to={ "/projects/buildings/edit/" + params.buildingId }
                >Edit</Link>
                <button 
                  type="button"
                  className="btn btn-link link-dark m-0 p-0 ms-3"
                  onClick={onDeleteClick}
                >Delete</button>
              </form>
            </div>
          </div>
          <div className="row g-0">
            <div className="col-12 col-md-5 pe-0 pe-md-4 mb-4 mb-md-0 text-center">
              <img 
                src={ building.image ? 
                      "data:image/png;base64," + building.image : 
                      "/projects/buildings/static/images/building_image.png" } 
                alt={ building.name }
                className="img-fluid"
              />
            </div>
            <div className="col-12 col-md-7">
              <h3 className="mb-2">{ building.name }</h3>
              <h5 className="text-muted mb-3">Occupancy: { building.occupancy }</h5>
              <h6 className="mb-2">Type: { getBuildingType() }</h6>
              <h6 className="mb-2">Tiles: { building.tiles ? building.tiles.join(', ') : '' }</h6>
              <h6 className="mb-2">Style: { building.style }</h6>
              <small className="mb-2">Last Updated: { building.lastUpdated }</small>
            </div>
          </div>
        </React.Fragment>
      );
    }
  }
}
