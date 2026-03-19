import React, { useState } from 'react';

const UserProfileManagement = () => {
    const [name, setName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const userEmail = 'user@example.com';  // Display-only field
    const userMobile = '+1234567890';     // Display-only field
    const [profileImage, setProfileImage] = useState(null);

    const handleNameChange = (e) => {
        setName(e.target.value);
        if (e.target.value.length < 2) {
            setErrorMessage('Name must be at least 2 characters long.');
        } else {
            setErrorMessage('');
        }
    };

    const handleImageUpload = (e) => {
        setProfileImage(e.target.files[0]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!errorMessage) {
            // Handle form submission logic here
            console.log('Name:', name);
            console.log('Profile Image:', profileImage);
        }
    };

    return (
        <div>
            <h1>User Profile Management</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>User Name:</label>
                    <input
type="text"
                    value={name}
                    onChange={handleNameChange}
                    required
                    />
                    {errorMessage && <span style={{color: 'red'}}>{errorMessage}</span>}
                </div>
                <div>
                    <label>Email:</label>
                    <input type="email" value={userEmail} readOnly />
                </div>
                <div>
                    <label>Mobile Number:</label>
                    <input type="tel" value={userMobile} readOnly />
                </div>
                <div>
                    <label>Profile Image:</label>
                    <input type="file" onChange={handleImageUpload} />
                </div>
                <button type="submit">Save</button>
            </form>
        </div>
    );
};

export default UserProfileManagement;