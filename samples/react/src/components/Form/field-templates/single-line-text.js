import React from 'react';

function SingleLineText({ field, value, isValid, errors, onChange }) {
  return (
    <React.Fragment>
      <label htmlFor={field.valueField.id} className={field.model.labelCssClass}>
        {field.model.title}
      </label>
      <input
        type="text"
        className={field.model.cssClass}
        id={field.valueField.id}
        name={field.valueField.name}
        value={value}
        maxLength={field.model.maxLength || null}
        placeholder={field.model.placeholderText}
        onChange={(e) => handleOnChange(field, e.target.value, onChange)}
      />
      {errors.map((e, index) => (
        <p key={index}>{e}</p>
      ))}
    </React.Fragment>
  );
}

function handleOnChange(field, fieldValue, callback) {
  let valid = true;

  if (field.model.required && !fieldValue) {
    valid = false;
  }

  callback(field.valueField.name, fieldValue, valid, []);
}

export default SingleLineText;
