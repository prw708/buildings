import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useParams } from 'react-router-dom';

export default function Pending(props) {
  let params = useParams();

  const [building, setBuilding] = useState({});

  useEffect(() => {
    clearTimeout(props.updateMessageTimeout);
    props.setUpdateMessageTimeout(setTimeout(() => {
      props.setSuccessMessage('');
      props.setErrorMessage('');
    }, 3000));
  }, [props.updateMessage]);

  useEffect(() => {
    getBuilding();
  }, []);

  const getBuilding = () => {
    props.setStatus('loading');
    let httpRequest = new XMLHttpRequest();
    if (!httpRequest) {
      return null;
    }
    httpRequest.open('GET', '/projects/buildings/pending/get/' + params.buildingId, true);
    httpRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    httpRequest.send();
    httpRequest.onreadystatechange = function() {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 200) {
          setBuilding(JSON.parse(DOMPurify.sanitize(httpRequest.responseText)));
        } else {
          let errors;
          try {
            errors = JSON.parse(DOMPurify.sanitize(httpRequest.responseText));
          } catch (e) {
            errors = null;
          }
          setBuilding(null);
          props.setSuccessMessage('');
          if (!errors || errors.length === 0) {
            props.setErrorMessage('An error occurred while getting the building.');
          } else {
            if (Array.isArray(errors)) {
              for (const e of errors) {
                if (e.param === 'displayPendingAdditionMessage') {
                  props.setErrorMessage(e.msg);
                  break;
                } else if (e.param === 'insufficientPrivileges') {
                  props.setErrorMessage(e.msg);
                  break;
                } else {
                  props.setErrorMessage('An error occurred while getting the building.');
                }
              }
            } else {
              props.setErrorMessage('An error occurred while getting the building.');
            }
          }
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

  if (!props.username || !props.admin) {
    return (
      <React.Fragment>
        <h2 className="mb-4">Pending Building</h2>
        <div className="alert alert-info mt-4 px-4">You must be an admin and <a href="/website/account/login" className="link-dark">logged in</a> to view a pending building.</div>
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
    if (!building) {
      return (
        <React.Fragment>
          <h2 className="mb-4">Pending Building</h2>
          <p className="mt-4">Building not found.</p>
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment>
          <h2 className="mb-4">Pending Building</h2>
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
