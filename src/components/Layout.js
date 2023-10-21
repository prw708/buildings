import * as React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout(props) {
  let location = useLocation();
  
  return (
    <React.Fragment>
      <div className="row g-0">
        { props.successMessage && 
          <div className="alert alert-success px-4 mb-0">{ props.successMessage }</div>
        }
        { props.errorMessage && 
          <div className="alert alert-danger px-4 mb-0">{ props.errorMessage }</div>
        }
        <nav className="d-flex flex-column flex-shrink-0 p-4 bg-light col-sm-5 col-md-4 col-lg-3">
          <Link to="/projects/buildings" className="d-flex align-items-center mb-0 me-md-auto link-dark text-decoration-none">
            <span className="fs-4">Actions</span>
          </Link>
          <hr className="link-dark" />
          <ul className="nav nav-pills flex-column mb-4">
            <li className="nav-item">
              <Link to="/projects/buildings" 
                className={ location.pathname === "/projects/buildings" ? "nav-link active" : "nav-link link-dark"}
              >All Buildings</Link>
            </li>
            <li className="nav-item">
              <Link to="/projects/buildings/add" 
                className={ location.pathname === "/projects/buildings/add" ? "nav-link active" : "nav-link link-dark"}
                reloadDocument
              >Add Building</Link>
            </li>
            <li className="nav-item">
              <Link to="/projects/buildings/delete" 
                className={ location.pathname === "/projects/buildings/delete" ? "nav-link active" : "nav-link link-dark"}
              >Delete Building</Link>
            </li>
          </ul>
          <span className="link-dark fs-4">Account</span>
          <hr className="link-dark" />
          <ul className="nav nav-pills flex-column mb-0">
            <li className="nav-item">
              <Link to="/projects/buildings/additions"
                className={ location.pathname === "/projects/buildings/additions" ? "nav-link active" : "nav-link link-dark"}
              >Pending Additions</Link>
            </li>
            <li className="nav-item">
              <Link to="/projects/buildings/deletions"
                className={ location.pathname === "/projects/buildings/deletions" ? "nav-link active" : "nav-link link-dark"}
              >Pending Deletions</Link>
            </li>
            <li className="nav-item">
              { props.username && 
                <form method="POST" action="/website/account/logout">
                  <input type="hidden" name="time" value={props.time} />
                  <input type="hidden" name="_csrf" value={props.csrfToken} />
                  <button 
                    type="submit" 
                    name="logout" 
                    value="true"
                    className="nav-link link-dark w-100 text-start bg-transparent border-0"
                  >Logout</button>
                </form>
              }
              { !props.username && 
                <a href="/website/account/login" className="nav-link link-dark">Login</a>
              }
            </li>
          </ul>
        </nav>
        <div className="col-sm-7 col-md-8 col-lg-9 p-4">
          <Outlet />
        </div>
      </div>
    </React.Fragment>
  );
}

