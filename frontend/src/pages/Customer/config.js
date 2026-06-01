export const fields = {
  name: {
    type: 'string',
    required: true,
  },
  country: {
    type: 'country',
    // color: 'red',
  },
  address: {
    type: 'textarea',
    label: 'Address',
  },
  phone: {
    type: 'phone',
  },
  email: {
    type: 'email',
  },
  customerId: {
    type: 'string',
    label: 'Customer ID',
  },
  gender: {
    type: 'select',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Other' },
    ],
  },
  fatherName: {
    type: 'string',
    label: "Father's Name",
  },
  dob: {
    type: 'date',
    label: 'Date of Birth',
  },
  aadharCardNumber: {
    type: 'aadhar',
    label: 'Aadhar Card Number',
  },
  panCardNumber: {
    type: 'string',
    label: 'PAN Card Number',
  },
  drivingLicence: {
    type: 'string',
    label: 'Driving Licence',
  },
  // Nominee Details
  nomineeName: {
    type: 'string',
    label: 'Nominee Name',
  },
  nomineeFatherHusbandName: {
    type: 'string',
    label: "Father's / Husband's Name",
  },
  nomineeRelationship: {
    type: 'string',
    label: 'Relationship',
  },
  nomineeDob: {
    type: 'date',
    label: 'Date of Birth (Nominee)',
  },
  nomineeMobile: {
    type: 'phone',
    label: 'Mobile Number (Nominee)',
  },
  nomineeAddress: {
    type: 'textarea',
    label: 'Address (Nominee)',
  },
  state: {
    type: 'string',
    label: 'State',
  },
  gstin: {
    type: 'string',
    label: 'GSTIN',
  },
};
