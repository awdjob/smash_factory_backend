// Generate password with at least one of each required character type
const crypto = require('crypto');
const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lower = 'abcdefghijklmnopqrstuvwxyz';
const numbers = '0123456789';
const special = '!@#$%^&*';
const all = upper + lower + numbers + special;

let password = '';
password += upper[crypto.randomInt(upper.length)]; // 1 uppercase
password += lower[crypto.randomInt(lower.length)]; // 1 lowercase  
password += numbers[crypto.randomInt(numbers.length)]; // 1 number
password += special[crypto.randomInt(special.length)]; // 1 special

// Fill the rest randomly
for (let i = 4; i < 16; i++) {
    password += all[crypto.randomInt(all.length)];
}

// Shuffle the password
password = password.split('').sort(() => Math.random() - 0.5).join('');
console.log(password);