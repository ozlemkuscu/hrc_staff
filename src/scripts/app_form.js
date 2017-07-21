/**
 * Created by gperry2 on 03/14/2017.
 * Modified by okuscu on 04/01/2017
 */

let myDropzone = void 0;
let staffDropzone = void 0;
let form;
//let sessionStatus = false;

function getFormJSON(form_id) {
  return $("#" + form_id).serializeJSON({ useIntKeysAsArrayIndex: true });
}
function checkFileUploads(payload) {
  let queryString = "";
  let binLoc = "";
  if (payload.uploads[0]) {
    $.each(payload.uploads, function (index, item) {
      if (binLoc == "") {
        binLoc = item.bin_id;
      } else {
        binLoc = binLoc + "," + item.bin_id;
      }
    })
    queryString = "&KeepFiles=" + binLoc;
  }

  if (payload.staff_uploads[0]) {
    $.each(payload.staff_uploads, function (index, item) {
      if (binLoc == "") {
        binLoc = item.bin_id;
      } else {
        binLoc = binLoc + "," + item.bin_id;
      }
    })
  }

  if (binLoc != "") {
    queryString = "&KeepFiles=" + binLoc;
  }

  return queryString;
}

function saveReport(action, payload, msg, form_id, repo) {
  // $(".btn").prop('disabled', true);

  let keepQueryString = checkFileUploads(payload);

  $.ajax({
    url: config.httpHost.app[httpHost] + config.api.post + repo + '?sid=' + getCookie('human_rights.sid') + keepQueryString,
    type: 'POST',
    data: JSON.stringify(payload),
    //   data: payload,
    headers: {
      'Content-Type': 'application/json; charset=utf-8;',
      'Cache-Control': 'no-cache'
    },
    dataType: 'json'
  }).done(function (data) {
    switch (action) {
      case 'save':
        if (data && data.EventMessageResponse && data.EventMessageResponse.Event && data.EventMessageResponse.Event.EventID) {
          // Route to /{id} draft page if new report is successfully saved
          hasher.setHash(data.EventMessageResponse.Event.EventID + '?alert=success&msg=' + msg.done + '&ts=' + new Date().getTime());
        } else {
          hasher.setHash('new?alert=danger&msg=' + msg.fail + '&ts=' + new Date().getTime());
        }
        break;

      case 'notify':
        if (data && data.EventMessageResponse && data.EventMessageResponse.Event && data.EventMessageResponse.Event.EventID) {
          // Email report notice to emergency management captain and incident manager/reporters
          emailNotice(data.EventMessageResponse.Event.EventID, action, ['captain']);
        } else {
          hasher.setHash('new?alert=danger&msg=' + msg.fail + '&ts=' + new Date().getTime());
        }
        break;

      case 'submit':
        if (data && data.EventMessageResponse && data.EventMessageResponse.Event && data.EventMessageResponse.Event.EventID) {
          let updatePayload = JSON.stringify({
            'payload': JSON.stringify(form.getData()),
            //   'payload': JSON.stringify(getFormJSON(form_id)),
            'status': config.status.Submitted
          });
          updateReport(data.EventMessageResponse.Event.EventID, action, updatePayload, msg, form.getData());
        } else {
          hasher.setHash('new?alert=danger&msg=' + msg.fail + '&ts=' + new Date().getTime());
        }
        break;

      default:
        break;
    }
  }).fail(function (textStatus, error) {
    alert("POST Request Failed: " + textStatus + ", " + error);
    hasher.setHash('new?alert=danger&msg=' + msg.fail + '&ts=' + new Date().getTime());
  }).always(function () {
    $(".btn").removeAttr('disabled').removeClass('disabled');
  });
}
function updateReport(fid, action, payload, msg, repo, formData) {
  //  $(".btn").prop('disabled', true);

  let keepQueryString = checkFileUploads(formData);

  $.ajax({
    url: config.httpHost.app[httpHost] + config.api.put + repo + '/' + fid + '?sid=' + getCookie('human_rights.sid') + keepQueryString,
    type: 'POST',
    data: payload,
    headers: {
      'Content-Type': 'application/json; charset=utf-8;',
      'Cache-Control': 'no-cache'
    },
    dataType: 'json'
  }).done(function (data) {
    switch (action) {
      case 'save':
        hasher.setHash(fid + '?alert=success&msg=' + msg.done + '&ts=' + new Date().getTime());
        break;
      case 'updateAttachments':
        break;
      case 'notify':
        // Email report notice to emergency management captain and incident manager/reporters
        //emailNotice(fid, action, ['captain']);
        break;

      case 'submit':
      case 'approve':
      case 'reject':
        // Email report notice to administrator, emergency management captain and incident manager/reporters
        //emailNotice(fid, action, ['administrator', 'captain']);
        hasher.setHash(fid + '?alert=success&msg=' + msg.done + '&ts=' + new Date().getTime());
        break;

      default:
        break;
    }
  }).fail(function (textStatus, error) {
    alert("POST Request Failed: " + textStatus + ", " + error);
    hasher.setHash(fid + '?alert=danger&msg=' + msg.fail + '&ts=' + new Date().getTime());
  }).always(function () {
    $(".btn").removeAttr('disabled').removeClass('disabled');
  });
}
function emailNotice(fid, action, recipients) {
  let emailTo;
  if ($("#modifiedEmail").val()) {
    emailTo = JSON.parse($("#modifiedEmail").val());
  } else {
    emailTo = {};
  }
  let emailAdmin = config.administrator['G'];
  let emailCaptain = config.captain['G'];

  if (recipients && recipients.indexOf('administrator') !== -1) {
    $.extend(emailTo, emailAdmin);
  }
  if (recipients && recipients.indexOf('captain') !== -1) {
    $.extend(emailTo, emailCaptain);
  }

  let emailRecipients = $.map(emailTo, function (email) {
    return email;
  }).filter(function (itm, i, a) {
    return i === a.indexOf(itm);
  }).join(',');

  let payload = JSON.stringify({
    'email': emailRecipients,
    'id': fid,
    'status': action,
    'home': 'G'
  });

  $.ajax({
    url: config.httpHost.app[httpHost] + config.api.email,
    type: 'POST',
    data: payload,
    headers: {
      'Content-Type': 'application/json; charset=utf-8;',
      'Cache-Control': 'no-cache'
    },
    dataType: 'json'
  }).done(function () {

    if (action === 'notify') {
      hasher.setHash(fid + '?alert=success&msg=notify.done&ts=' + new Date().getTime());
    }
  }).fail(function (textStatus, error) {
    alert("POST Request Failed: " + textStatus + ", " + error);

    if (action === 'notify') {
      hasher.setHash(fid + '?alert=danger&msg=notify.fail&ts=' + new Date().getTime());
    }
  });
}
function processForm(action, form_id, repo) {
  let fid = $("#fid").val();
  let msg, payload;
  //  let f_data = getFormJSON(form_id);
  let f_data = form.getData();

  f_data.uploads = processUploads(myDropzone, repo, true);
  f_data.staff_uploads = processUploads(staffDropzone, repo, true);

  switch (action) {
    case 'save':
      msg = {
        'done': 'save.done',
        'fail': 'save.fail'
      };
      var complainStatusVal = $("#complaintStatus").val();
      var jsonStatusVal = "";

      /*
       'DraftHRC': 'New',
       'SubmittedHRC': 'Ongoing',
       'ApprovedHRC': 'Closed',
       'DeletedHRC': 'Deleted'
       */
      switch ($("#complaintStatus").val()) {
        case config.status.DraftHRC:
          jsonStatusVal = config.status.Draft;
          break;
        case config.status.ApprovedHRC:
          jsonStatusVal = config.status.Approved;
          break;
        case config.status.SubmittedHRC:
          jsonStatusVal = config.status.Submitted;
          break;
        default:
          jsonStatusVal = config.status.Draft;
      }

      payload = JSON.stringify({
        'payload': JSON.stringify(f_data),
        'status': jsonStatusVal
      });


      // Update report and move to Submitted state
      if (fid) {
        updateReport(fid, action, payload, msg, repo, f_data);
      }
      // Create new report and move to Submitted state
      else {
        // payload = JSON.stringify(f_data);
        payload = f_data;
        saveReport(action, payload, msg, form_id, repo);
      }
      break;
    case 'notify':
    case 'updateAttachments':
      msg = {
        'done': 'save.done',
        'fail': 'save.fail'
      };
      // Update report and notify emergency management captain for status 'notify'
      if (fid) {
        payload = JSON.stringify({
          'payload': JSON.stringify(f_data)
        });
        updateReport(fid, action, payload, msg, repo, f_data);
      }
      // Create new report and notify emergency management captain for status 'notify'
      else {
        //  payload = JSON.stringify(f_data);
        payload = f_data;
        saveReport(action, payload, msg, form_id, repo);
      }
      break;

    case 'submit':
      msg = {
        'done': 'submit.done',
        'fail': 'submit.fail'
      };

      // Update report and move to Submitted state
      if (fid) {

        var complainStatusVal = $("#complaintStatus").val();
        var jsonStatusVal = "";

        /*
         'DraftHRC': 'New',
         'SubmittedHRC': 'Ongoing',
         'ApprovedHRC': 'Closed',
         'DeletedHRC': 'Deleted'
         */
        switch ($("#complaintStatus").val()) {
          case config.status.DraftHRC:
            jsonStatusVal = config.status.Draft;
            break;
          case config.status.ApprovedHRC:
            jsonStatusVal = config.status.Approved;
            break;
          case config.status.SubmittedHRC:
            jsonStatusVal = config.status.Submitted;
            break;
          default:
            jsonStatusVal = config.status.Draft;
        }

        payload = JSON.stringify({
          'payload': JSON.stringify(f_data),
          'status': jsonStatusVal
        });

        updateReport(fid, action, payload, msg, repo, f_data);
      }
      // Create new report and move to Submitted state
      else {
        //  payload = JSON.stringify(f_data);
        payload = f_data;
        saveReport(action, payload, msg, form_id, repo);
      }
      break;
    case 'approve':
      msg = {
        'done': 'approve.done',
        'fail': 'approve.fail'
      };
      // Update report and move to Approved state
      if (fid) {
        payload = JSON.stringify({
          'payload': JSON.stringify(f_data),
          'status': config.status.Approved
        });
        updateReport(fid, action, payload, msg, repo, f_data);
      }
      break;
    case 'reject':
      msg = {
        'done': 'reject.done',
        'fail': 'reject.fail'
      };
      // Update report and move back to Draft (Yes) state
      if (fid) {
        payload = JSON.stringify({
          'payload': JSON.stringify(f_data),
          'status': config.status.Draft
        });
        updateReport(fid, action, payload, msg, repo, f_data);
      }
      break;
    default:
      break;
  }
}
function loadForm(destinationSelector, data, fid, status, form_id, repo, allJSON, docMode) {
  let adminForm = true;
  let showAdminHeader = true;
  let showContactSections = false;
  let showAttachmentSection = false;
  let debugMode = false;

  //$(destinationSelector).empty();
  //  let sections = $.merge($.merge(getAdminSectionsTop(), getSubmissionSections()), getAdminSectionsBottom());
  let sections = $.merge(getSubmissionSections(data), getAdminSectionsBottom(data));

  //  form = new CotForm({
  form = new CotForm2({
    id: form_id,
    rootPath: '',
    title: '',
    useBinding: false,
    sections: sections,
    success: function (e) {
      // Pass callback function based on submit button clicked
      let action = $("#action").val();
      if (['save', 'notify', 'submit', 'approve', 'reject'].indexOf(action) !== -1) {
      } else {
        //  console.log('Error: Form action is not set');
      }
      e.preventDefault();
    }
  });

  app.addForm(form, 'bottom');

  //getSessionStorage(data);

  initForm(data);
  // myDropzone = new Dropzone("div#" + upload_selector, setupDropzone({ fid: fid, form_id: form_id, url: config.api.upload + config.default_repo + '/' + repo }));

  myDropzone = new Dropzone("div#admin_dropzone", $.extend(config.admin.myDropzone, {
    "dz_id": "admin_dropzone", "fid": fid, "form_id": form_id,
    "url": config.api.upload + config.default_repo + '/' + repo,
  }));
  //"dz_id": "admin_dropzone", "fid": fid, "form_id": form_id,
  staffDropzone = new Dropzone("div#staff_dropzone", $.extend(config.admin.staffDropzone, {
    "dz_id": "staff_dropzone", "fid": fid, "form_id": form_id,
    "url": config.api.upload + config.default_repo + '/' + repo,
  }));

  $(".dz-hidden-input").attr("aria-hidden", "true");
  $(".dz-hidden-input").attr("aria-label", "File Upload Control");

  // Set datetime picker for Date of Action field
  $(".datetimepicker.wir\\[0\\]\\[dateAction\\]").datetimepicker({ "format": "DD/MM/YYYY" });

  let modifiedUsername = decodeURIComponent(getCookie('human_rights.cot_uname'));
  let modifiedName = decodeURIComponent(getCookie('human_rights.firstName')) + ' ' + decodeURIComponent(getCookie('human_rights.lastName'));
  let modifiedEmail = decodeURIComponent(getCookie('human_rights.email'));

  // if (modifiedEmail == "") {
  //   modifiedEmail = "graham.perry@toronto.ca";
  // }

  // New report
  if (!data) {
    // Set created by and modified by to current user
    $("#createdBy, #modifiedBy").val(modifiedUsername);
    var dataCreated = new Date();


    var dataCreated = new Date();
    // dataCreatedFormatted = moment(dataCreated).format(config.dateTimeFormat);
    // $("#complaintCreated").val(dataCreatedFormatted);

    $("#complaintCreated").val(dataCreated);
    $("#yearCreated").val(dataCreated.getFullYear());

    $("#modifiedEmail").val('{"' + modifiedName + '":"' + modifiedEmail + '"}');

    // Autofill name of Incident Manager field
    $("#incidentManager").val(modifiedName);
  }
  // View/Edit existing report
  else {

    if ($("#complaintCreated").val() == "") {
      $("#complaintCreated").val(moment(allJSON.created).format(config.dateTimeFormat));
    }

    //    if ($("#yearCreated").val() == "") {
    //      var dataCreated = new Date(allJSON.created);
    //      $("#yearCreated").val(dataCreated.getFullYear());
    //    }

    showUploads(myDropzone, 'uploads', data, repo, true, true);
    showUploads(staffDropzone, 'staff_uploads', data, repo, true, true);

    // Populate existing form with JSON object from GET request

    /*    $("#" + form_id).populate(data, {
          phpIndices: false,
          resetForm: true
        });
   */

    form.setData(data);

    if (fid) {
      $("#fid").val(fid);
    }

    $("#modifiedBy").val(modifiedUsername);
    if (!$("#modifiedEmail").val()) {
      $("#modifiedBy").val(modifiedUsername);
      $("#modifiedEmail").val('{"' + modifiedName + '":"' + modifiedEmail + '"}');
    }
    else if ($("#modifiedEmail").val().indexOf(modifiedEmail) == -1) {
      if ($("#modifiedEmail").val()) {
        let emailObj = JSON.parse($("#modifiedEmail").val());
        emailObj[modifiedName] = modifiedEmail;
        $("#modifiedEmail").val(JSON.stringify(emailObj));
      } else {
        $("#modifiedEmail").val('{"' + modifiedName + '":"' + modifiedEmail + '"}');
      }
    }
  }

  if (docMode == "read") {
    // Open the document in read-only mode
    $("#" + form_id).find("input, textarea, select, button").attr('disabled', 'disabled');
    $(".dz-hidden-input").prop("disabled", true);
    $(".dz-remove").hide();
    $(".save-action").hide();
    $("#savebtn").hide();
  } else {
    $(".edit-action").hide();
  }

  // New or existing Draft report
  if (status === config.status.Draft || !status) {
    // Remove Approve and Reject buttons
    $("#approveReportElement, #rejectReportElement").remove();
  }
  // Submitted or Approved report
  else if (status === config.status.Submitted || status === config.status.Approved) {

    // Disable all fields and remove submission buttons if not administator
    if ($.inArray(config.groups.hrc_admin, groupMemberships) === -1) {
      /// //    $("#" + form_id).find("input, textarea, select, button").attr('disabled', 'disabled');
      $("#saveSubmit").remove();
    } else {
      $(".btn-save").html($(".btn-save").html().replace(config.button.saveReport, config.button.save));
      $("#notifyReportElement, #submitReportElement").remove();
    }
  }
}
function getGroundFields(typeCompaintVal) {
  let groundChoice;
  // SET THE SELECTION FOR THE SELECTED COMPLAINT TYPE
  switch (typeCompaintVal) {
    case "Access to or use of City of Toronto facilities":
      groundChoice = config.groundAccessFacilities.choices;
      break;
    case "Administration or delivery of City of Toronto services":
      groundChoice = config.groundAdministration.choices;
      break;
    case "Employment with the City of Toronto":
      groundChoice = config.groundEmployment.choices;
      break;
    case "Job application with the City of Toronto":
      groundChoice = config.groundJobApplication.choices;
      break;
    case "Legal contracts with the City of Toronto":
      groundChoice = config.groundLegalContracts.choices;
      break;
    case "Occupancy of City of Toronto-owned accommodations":
      groundChoice = config.groundOccupancy.choices;
      break;
    case "Other":
      groundChoice = "";
      $("#groundElement").hide();
      //    $("#groundOtherElement").show(); // Public only
      break;
    default:
      $("#groundElement").hide();
      $("#groundOtherElement").hide(); // Public only
  }

  $("#groundElement fieldset label").remove();
  if (typeCompaintVal != "" && typeCompaintVal != "Other") {
    $("#groundElement").show();
    $("#groundOtherElement").hide();

    $.each(groundChoice, function (i, item) {
      //  let newVal = '<label class="vertical entryField checkboxLabel col-xs-12 col-sm-6 col-md-4 col-lg-3"><input name="ground[]" id="ground_' + (i) + '" title="Ground" type="checkbox" ';
      let newVal = '<label class="vertical entryField checkboxLabel col-xs-12 col-sm-6 col-md-4 col-lg-3"><input name="ground" data-fv-field="ground" class="required" id="ground_' + (i) + '" title="Ground" type="checkbox" ';
      if (i == 0) {
        //  newVal += 'class="required"  data-fv-field="ground[]" data-fv-notempty data-fv-message="Ground is required" data-fv-notempty-message="Ground can not be empty" ';
        newVal += 'data-fv-field="ground" class="required" data-fv-notempty data-fv-message="Ground is required" data-fv-notempty-message="Ground can not be empty" ';
        newVal += 'value="' + item.text + '">';
        //   newVal += '<i class="form-control-feedback" data-fv-icon-for="ground[]" style="display: none;"></i>'
        newVal += '<i class="form-control-feedback" data-fv-icon-for="ground" style="display: none;"></i>'
        newVal += '<span>' + item.text + '</span></label>';
      } else {
        newVal += 'value="' + item.text + '"><span>' + item.text + '</span></label>';
      }
      $("#groundElement fieldset").append(newVal);
      $('#' + form_id).data('formValidation').addField($('#ground_' + i))
    });
    if (app.data["No Ground"] != "") {
      let newVal = '<label class="vertical entryField checkboxLabel col-xs-12 col-sm-6 col-md-4 col-lg-3"><input name="ground" data-fv-field="ground" class="required" id="ground_' + (groundChoice.length) + '" title="Ground" type="checkbox" ';
      newVal += 'value="' + app.data["No Ground"] + '"><span>' + app.data["No Ground"] + '</span></label>';
      $("#groundElement fieldset").append(newVal);
      $('#' + form_id).data('formValidation').addField($('#ground_' + groundChoice.length))
    }

  } else if (typeCompaintVal == "Other") {
    $("#groundElement").hide();
    //   $("#groundOtherElement").show();  // Public only
  }
}
function employeeToggle(val, etVal, divVal, jtVal) {
  let et_val = $(etVal).val();
  let etObj = $(etVal + 'Element');
  let divObj = $(divVal + 'Element');
  let jtObj = $(jtVal + 'Element');

  if (val == "Yes") {
    etObj.show();
    divObj.show();
    et_val == ("Non-union" | "") ? jtObj.hide() : jtObj.show();
  } else {
    $(divVal).val('');
    $(etVal).val('');
    $(jtVal).val('');
    etObj.hide();
    divObj.hide();
    jtObj.hide();
  }
}
function unionToggle(val, modVal) {
  let modObj = modVal + "Element";
  let jt = $(modObj);
  var cotJobTypeChoice = "";
  if ((val === "Union") || (val === "Union executive")) {
    cotJobTypeChoice = config.cotJobTypeUnionList.choices;
    $(modObj + " label span").first().text(app.data["union"]);
  } else if (val === "Non-union") {
    cotJobTypeChoice = config.cotJobTypeNonUnionList.choices;
    $(modObj + " label span").first().text(app.data["nonUnion"]);
  } else {
    jt.hide()
  }
  $(modObj + " option").remove();
  if (cotJobTypeChoice != "") {
    let i = 0;
    for (i = 0; i < cotJobTypeChoice.length; i++) {
      var newVal = '<option value="' + cotJobTypeChoice[i].value + '">' + cotJobTypeChoice[i].text + '</option>';
      $(modVal).append(newVal);
    }
    jt.show();
    cotJobTypeChoice = "";
  } else {
    jt.hide();
  }
}
function divisionComplaintToggle(val) {
  let dco = $('#divisionComplaintOtherElement');
  if (val === "Other") {
    dco.show();
  } else {
    dco.hide();
  }
}
function otherToggle(val, listName) {
  let jt = $('#' + listName + 'Element');
  if (val === "Other") {
    jt.show();
  } else {
    $('#' + listName).val('');
    jt.hide();
  }
}
function solutionToggle() {
  if ($("#resolveCompQ").val() === "Yes" || $("#hrtoQ").val() === "Yes" || ($("#grievanceQ").val() === "Yes")) {
    $("#solutionSec").show();
  } else {
    $("#solutionSec").hide();
  }
}
function initForm(data) {
  getGroundFields("");
  $("#typeComplaint").on('change', function () {
    getGroundFields(this.value);
  });
  $('[name=cityEmployee]').on('change', function () {
    employeeToggle(this.value, '#cotEmployeeType', '#cotDivision', '#cotJobType');
  });
  $("#cotEmployeeType").on('change', function () {
    unionToggle(this.value, '#cotJobType');
  });
  $("#divisionComplaint").on('change', function () {
    divisionComplaintToggle(this.value);
  });
  $("#resolveCompQ").on('change', function () {
    solutionToggle();
  })
  $("#hrtoQ").on('change', function () {
    solutionToggle();
  })
  $("#grievanceQ").on('change', function () {
    solutionToggle();
  })
  // START - Staff only
  $('#role').on('change', function () {
    otherToggle(this.value, 'roleOther');
  });

  // FOR GRIDS
  // if (data) {

  $('#complaintStatus').on('change', function () {
    //  if(this.value == config.status.ApprovedHRC){
    $('#' + form_id).formValidation('revalidateField', $('#closeDate'));
    $('#' + form_id).formValidation('revalidateField', $('#openDate'));
    $('#' + form_id).formValidation('revalidateField', $('#actionList'));
    $('#' + form_id).formValidation('revalidateField', $('#caseManager'));
    //  }
  });

  /*  $('#enquiryList').on('change', function () {
      otherToggle(this.value, 'enquiryListOther');
    });
    $('#consultationList').on('change', function () {
      otherToggle(this.value, 'consultationListOther');
    });
    $('#interventionList').on('change', function () {
      otherToggle(this.value, 'interventionListOther');
    });*/
  // END - Staff only

  // we need to call off click first to overcome multiple POST requests with event registration
  //$(".save-action").click(function () {
  $(".save-action").off('click').on('click', function () {
    $(".edit-action").hide();
    $("#action").val($(this).attr('id'));
    var hrc_fv = $('#' + form.cotForm.id).data('formValidation');
    if (auth()) {
      hrc_fv.validate();
      if (hrc_fv.isValid()) {
        submitForm();
      }
    } else {
      $("#savebtn").hide();
    }
    //  } else {
    //    setSessionStorage(form.getData());
    //  }
  });

  $(".edit-action").off('click').on('click', function () {
    $("#" + form_id).find("input, textarea, select, button").attr('disabled', false);
    $(".dz-hidden-input").prop("disabled", false);
    $(".dz-remove").show();
    $(".edit-action").hide();
    $(".save-action").show();
    $("#savebtn").show();
    docMode = "";
  });

  $("#savebtn").click(function () {
    $(".edit-action").hide();
    $("#action").val($(this).attr('id'));
    var hrc_fv = $('#' + form.cotForm.id).data('formValidation');
    if (auth()) {
      hrc_fv.validate();
      if (hrc_fv.isValid()) {
        submitForm();
        scroll(0, 0);
      }
    } else {
      $("#savebtn").hide();
      scroll(0, 0);
    }
    //   } else {
    //    setSessionStorage(form.getData());
    //   }
  });

  if (data) {
    // HIDE/SHOW FIELDS BASED ON OTHER FIELD VALUES
    getGroundFields(data.typeComplaint);
    employeeToggle(data.cityEmployee, '#cotEmployeeType', '#cotDivision', '#cotJobType');
    unionToggle(data.cotEmployeeType, '#cotJobType');

    // divisionComplaintToggle(data.divisionComplaint); // Public only
    // START - Staff only
    otherToggle(data.role, 'roleOther');
    /*   otherToggle(data.enquiryList, 'enquiryListOther');
       otherToggle(data.consultationList, 'consultationListOther');
       otherToggle(data.interventionList, 'interventionListOther');*/
    // END - Staff only   
    if (data.resolveCompQ === "y" || data.hrtoQ === "y" || data.grievanceQ === "y") {
      $("#solutionSec").show();
    } else {
      $("#solutionSec").hide();
    }

  } else {

    getGroundFields("");
    employeeToggle("No", "#cotEmployeeType", "#cotDivision", "#cotJobType");
    unionToggle("", "#cotJobType");
    otherToggle("", 'roleOther');

    /*   otherToggle("", 'enquiryListOther');
       otherToggle("", 'consultationListOther');
       otherToggle("", 'interventionListOther');*/
    $("#solutionSec").hide();
  }

}
function submitForm() {
  //verify user still has a session

  if (auth()) {
    processForm('save', form.cotForm.id, config.default_repo);
  } else {
    scroll(0, 0);
  }
}
function getSubmissionSections(data) {
  let section = [
    {
      id: "contactInfoSec",
      title: app.data["Contact information Section"],
      className: "panel-info",
      rows: [
        {
          fields: [
            { "id": "firstName", "title": app.data["First Name"], "required": true, "className": "col-xs-12 col-md-6" },
            { "id": "lastName", "title": app.data["Last Name"], "required": true, "className": "col-xs-12 col-md-6" }
          ]
        },
        {
          fields: [{ "id": "title", "title": app.data["Title"], "className": "col-xs-12 col-md-6" },
          { "id": "role", "title": app.data["Role"], "required": true, "type": "dropdown", "choices": config.role.choices },
          { "id": "roleOther", "title": app.data["Role Other"], "className": "col-xs-12 col-md-6" }]
        },
        {
          fields: [
            { "id": "phone", "required": true, "title": app.data["Phone"], "className": "col-xs-12 col-md-6" }, // "required":true," "validationtype": "Phone", for public but not for staff
            { "id": "altPhone", "title": app.data["Alternative Phone"], "className": "col-xs-12 col-md-6" } // "validationtype": "Phone" for public but not for staff
          ]
        },
        {
          fields: [
            { "id": "address", "title": app.data["Address"] },
            { "id": "email", "title": app.data["Email"], "validationtype": "Email", "validators": { regexp: { regexp: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, message: 'This field must be a valid email. (###@###.####)' } } }
          ]
        },
        {
          fields: [{
            "id": "cityEmployee",
            "orientation": "horizontal",
            "title": app.data["Cot Employee"],
            //   "required": true,
            "type": "radio",
            "value": "No",
            "choices": config.choices.yesNo,
            "className": "col-xs-12 col-md-6",
          }]
        },
        {
          fields: [
            { "id": "cotDivision", "title": app.data["cotDivision"], "type": "dropdown", "choices": config.division.choices, "className": "col-xs-12 col-md-4" },
            { "id": "cotEmployeeType", "title": app.data["cotEmployeeType"], "type": "dropdown", "choices": config.cotEmployeeTypeList.choices, "className": "col-xs-12 col-md-4" },
            { "id": "cotJobType", "title": app.data["union"], "type": "dropdown", "choices": config.cotJobTypeUnionList.choices, "className": "col-xs-12 col-md-4" }
          ]
        }

      ]
    },
    {
      id: "addContactsSec",
      title: "ADDITIONAL CONTACTS",
      className: "panel-info",
      rows: [
        {
          grid2: {
            id: 'grid', // don't modify this value
            add: true, //appears to not be in use
            title: 'Details', //a title for the grid
            headers: [ //an array of objects with title values, for the grid column headings, not used for grid2
              { title: 'Heading 1' }, { title: 'Heading 2' }],
            addButtonLabel: 'Add',
            removeButtonLabel: 'Remove',
            initQty: data == null ? 1 : (data.grid == null ? 1 : parseInt(data.grid)),// sets the initial number of grid objects
            fields: [{ "id": "addfirstName", "title": app.data["First Name"], "className": "col-xs-12 col-md-4 col-lg-4" },
            { "id": "addlastName", "title": app.data["Last Name"], "className": "col-xs-12 col-md-4 col-lg-4" },
            { "id": "addtitle", "title": app.data["Title"], "className": "col-xs-12 col-md-4 col-lg-4" },
            { "id": "addrole", "title": app.data["Role"], "type": "dropdown", "choices": config.role.choices, "className": "col-xs-12 col-md-4  col-lg-4" },
            { "id": "addroleOther", "title": app.data["Role Other"], "className": "col-xs-12 col-md-4 col-lg-4" },
            { "id": "addemail", "title": app.data["Email"], "validationtype": "Email", "validators": { regexp: { regexp: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, message: 'This field must be a valid email. (###@###.####)' } }, "className": "col-xs-12 col-md-4 col-lg-4" },
            { "id": "addphone", "title": app.data["Phone"], "className": "col-xs-12 col-md-4" },
            { "id": "addaltPhone", "title": app.data["Alternative Phone"], "className": "col-xs-12 col-md-4" },
            { "id": "addaddress", "title": app.data["Address"], "className": "col-xs-12 col-md-4 col-lg-4" },
            { "id": "addcityEmployee", "orientation": "horizontal", "title": app.data["Cot Employee"], "type": "dropdown", "value": "Yes", "choices": config.choices.yesNo, "className": "col-xs-6 col-md-4" },
            { "id": "addcotDivision", "title": app.data["cotDivision"], "type": "dropdown", "choices": config.division.choices, "className": "col-xs-12 col-md-4" },
            { "id": "addcotEmployeeType", "title": app.data["cotEmployeeType"], "type": "dropdown", "choices": config.cotEmployeeTypeList.choices, "className": "col-xs-12 col-md-4" },
            { "id": "addcotJobType", "title": app.data["union"], "type": "dropdown", "choices": config.cotJobTypeUnionList.choices, "className": "col-xs-12 col-md-4" },
            { "id": "addcotJobTypeNonUnion", "title": app.data["nonUnion"], "type": "dropdown", "choices": config.cotJobTypeNonUnionList.choices, "className": "col-xs-12 col-md-4" }
            ]
          }
        }]// rows
    },
    {
      id: "eligibilitySec",
      title: app.data["Eligibility"],
      className: "panel-info",
      rows: [
        {
          fields: [
            { "id": "divisionComplaint", "required": true, "title": app.data["CityDivision"], "type": "dropdown", "choices": config.division.choices, "className": "col-xs-12 col-md-6" },
            //  { "id": "divisionComplaintOther", "title": "", "type": "html", "html": app.data["Division Other Details"], "className": "col-xs-12 col-md-12" },  // Public only
            {
              "id": "typeComplaint",
              "title": app.data["Type of Complaint"],
              "type": "dropdown",
              "className": "col-xs-10 col-md-6",
              "required": true,
              "choices": config.complaintType.choices
              //  ,"posthelptext": app.data["typeComplaintHelpButton"] // Public only
            },
            {
              "id": "ground", "required": true,
              "title": app.data["Ground"],
              //   "prehelptext": app.data["groundHelpButton"], // Public only
              "type": "checkbox",
              "choices": [], "className": "col-xs-12 col-md-12"
            },
            { "id": "groundOther", "title": "Description For Ground Other", "prehelptext": "", "type": "html", "html": app.data["Ground Other Details"], "className": "col-xs-12 col-md-12" } // Public only
          ]
        }
      ]
    },
    {
      id: "complaintDetailsSec",
      title: app.data["Complaint Details Section"],
      className: "panel-info",
      rows: [
        {
          fields: [
            { "id": "cdText1", "title": "", "type": "html", "html": app.data["ComplaintDetailText1"], "className": "col-xs-12 col-md-12" }
          ]
        },
        {
          fields: [
            { "id": "incidentDate", "title": app.data["Date of the Incident"], "type": "datetimepicker", "placeholder": config.dateFormat, "options": { format: config.dateFormat, maxDate: new Date() }, "className": "col-xs-12 col-md-4" }
          ]
        },
        {
          fields: [
            { "id": "cdText2", "title": "", "type": "html", "html": app.data["ComplaintDetailText2"] }
          ]
        },
        {
          fields: [
            { "id": "explanation", "title": app.data["Explanation"], "type": "textarea" }
          ]
        },
        {
          // THESE FIELD HAS DIFFERENT OPTIONS FOR PUBLIC AND STAFF
          fields: [
            { "id": "issue", "required": true, "title": app.data["Issue"], "type": "checkbox", "choices": config.issue_staff.choices, "className": "vertical entryField checkboxLabel col-xs-12 col-sm-6 col-md-4 col-lg-3" }
            //"className": "col-xs-12 col-md-6"  // Help is Public only - "prehelptext": app.data["issueHelpButton"]
            // { "id": "issueHelp", "title": "", "type": "html", "html": "<button type=\"button\" aria-label=\"Issue help button\" class=\"btn btn-primary btn-xs\" id=\"Issue-help\" onclick=\"javascript:void window.open('html//issueHelp.html','1423842457839','width=500,height=500,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=0,top=0');return false;\" >Help</button>" },
          ]
        },
        {
          fields: [
            { "id": "cdText3", "title": "", "type": "html", "html": app.data["ComplaintDetailText3"] }
          ]
        },
        {
          fields: [
            { "id": "complaintDetails", "title": app.data["Complaint Details"], "type": "textarea" }
          ]
        },
        {
          fields: [
            { "id": "docsIntro", "title": "File Attachments", "type": "html", "aria-label": "Dropzone File Upload Control Field", "html": '<section aria-label="File Upload Control Field" id="attachment"> <div class="dropzone" id="admin_dropzone"></div></section><section id="uploads"></section>' }
          ]
        },
        {
          fields: [
            { "id": "resolveCompQ", "title": app.data["Resolve complaint"], "type": "dropdown", "orientation": "horizontal", "choices": config.choices.yesNoSelect, "className": "col-xs-12 col-md-6" }
          ]
        },
        {
          fields: [
            { "id": "hrtoQ", "title": app.data["Filed HRTO application"], "type": "dropdown", "orientation": "horizontal", "choices": config.choices.yesNoSelect, "className": "col-xs-12 col-md-6" }
          ]
        },
        {
          fields: [
            { "id": "grievanceQ", "title": app.data["Filed grievance"], "type": "dropdown", "orientation": "horizontal", "choices": config.choices.yesNoSelect, "className": "col-xs-12 col-md-6" }
          ]
        }
      ]
    },
    {
      id: "solutionSec",
      title: "",
      className: "panel-info",
      rows: [
        {
          fields: [
            { "id": "cdText5", "title": "", "type": "html", "html": app.data["ComplaintDetailText7"] }
          ]
        },
        {
          fields: [
            { "id": "moreDetails", "title": app.data["More details"], "type": "textarea" }
          ]
        }
      ]
    },
    {
      id: "resSec",
      className: "panel-info",
      rows: [
        {
          fields: [
            { "id": "resDesired", "title": app.data["Resolution desired"], "prehelptext": "Describe what resolution you would like happen", "type": "textarea" }
          ]
        },
        {
          fields: [
            { "id": "compAgainst", "title": app.data["Complaint against"], "prehelptext": "Please list all names, separated by semi-colons(;)" }
          ]
        },
        {
          fields: [
            { "id": "footer1", "title": "", "type": "html", "html": app.data["ComplaintDetailText6"] }
          ]
        }
        //    ]
        //   },
        //   {
        //     id: "secActions",
        //     rows: [
        , {
          fields: [
            {
              id: "help_dialog_grounds",
              type: "html",
              html: `  <div class="modal fade" id="groundsHelp" role="dialog" tabindex="-1" aria-labelledby="groundsHelpTitle" aria-describedby="groundsHelpDesc"><div class="modal-dialog"><div class="modal-content"> <div class="modal-header" id="groundsHelpTitle">
                                  <button type="button" class="close" data-dismiss="modal">&times;</button><h4 class="modal-title">`+ app.data["groundsHelpHeader"] + `</h4></div>
                                <div class="modal-body" id="groundsHelpDesc"><p>`+ app.data["groundsHelpBody"] + `</p></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>
                  `
            },
            {
              id: "help_dialog_grounds_other",
              type: "html",
              html: `  <div class="modal fade" id="groundsHelpOther" role="dialog" tabindex="-1" aria-labelledby="groundsHelpOtherTitle" aria-describedby="groundsHelpOtherDesc"><div class="modal-dialog"><div class="modal-content"> <div class="modal-header" id="groundsHelpOtherTitle">
                                  <button type="button" class="close" data-dismiss="modal">&times;</button><h4 class="modal-title">`+ app.data["groundsHelpOtherHeader"] + `</h4></div>
                                <div class="modal-body" id="groundsHelpOtherDesc"><p>`+ app.data["groundsHelpOtherBody"] + `</p></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>
                  `
            },
            {
              id: "help_dialog_Issue",
              type: "html",
              html: `  <div class="modal fade" id="issueComplaintHelp" role="dialog" tabindex="-1" aria-labelledby="issueComplaintHelpTitle" aria-describedby="issueComplaintHelpDesc"><div class="modal-dialog"><div class="modal-content"> <div class="modal-header" id="issueComplaintHelpTitle">
                                  <button type="button" class="close" data-dismiss="modal">&times;</button><h4 class="modal-title">`+ app.data["issueHelpHeader"] + `</h4></div>
                                <div class="modal-body" id="issueComplaintHelpDesc"><p>`+ app.data["issueHelpBody"] + `</p></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>
                  `
            }
            ,
            {
              id: "help_dialog_Type",
              type: "html",
              html: `  <div class="modal fade" id="typeComplaintHelp" role="dialog" tabindex="-1" aria-labelledby="typeComplaintHelpTitle" aria-describedby="typeComplaintHelpDesc"><div class="modal-dialog"><div class="modal-content"> <div class="modal-header" id="typeComplaintHelpTitle">
                                  <button type="button" class="close" data-dismiss="modal">&times;</button><h4 class="modal-title">`+ app.data["typeOfComplaintHelpHeader"] + `</h4></div>
                                <div class="modal-body" id="typeComplaintHelpDesc"><p>`+ app.data["typeOfComplaintHelpBody"] + `</p></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>
                  `
            }
          ]
        }
      ]
    }
  ]
  return section;
}
function getAdminSectionsTop() {
  //  var sections = [{rows: [{fields: [{ "id": "contactHow", "title": app.data["Contacted By"], "type": "checkbox", "choices": config.contactHow.choices }]}]}];
  //  return sections;
}
function getAdminSectionsBottom(data) {
  var sections = [{
    "title": app.data["Staff Area Footer"],
    "id": "adminSectionsBottom",
    className: "panel-info",
    rows: [{
      fields: [{
        "id": "actionList",
        "required": true,
        "title": app.data["Action List"],
        "type": "radio",
        "orientation": "horizontal",
        "choices": config.actionList.choices,
        "class": "col-xs-12 col-md-6",
        "validators": {
          callback: {
            message: app.data["Action List"] + ' is required',
            // this is added to formValidation
            callback: function (value, validator, $field) {
              var checkVal = $("#complaintStatus").val();
              var fVal = $('#' + form_id).find('[name="actionList"]:checked').val();
              return (checkVal !== config.status.ApprovedHRC) ? true : (fVal !== undefined);
            }
          }
        }
      }]
    }, {
      fields: [{
        "id": "enquiryList",
        "title": app.data["Enquiry List"],
        "type": "dropdown",
        "choices": config.enquiryList.choices,
        "class": "col-xs-12 col-md-6"
      }]
    }, {
      fields: [{
        "id": "consultationList",
        "title": app.data["Consultation List"],
        "type": "dropdown",
        "choices": config.consultationList.choices
      }, {
        "id": "consultationListOther",
        "title": app.data["Consultation List Other"]
      }]
    }, {
      fields: [{
        "id": "interventionList",
        "title": app.data["Intervention List"],
        "type": "dropdown",
        "choices": config.interventionList.choices
      }, {
        "id": "interventionListOther",
        "title": app.data["Intervention List Other"]
      }]
    }, {
      fields: [{
        "id": "complaintStatus",
        "title": app.data["Complaint Status"],
        "type": "dropdown",
        "choices": config.complaintStatus.choices,
        "class": "col-xs-12 col-md-6"
      }, {
        "id": "actionReferral",
        "title": app.data["Action Referral"],
        "type": "dropdown",
        "choices": config.actionReferral.choices,
        "class": "col-xs-12 col-md-6"
      }]
    }, {
      fields: [{
        "id": "openDate",
        "title": app.data["Date Open"],
        "required": true,
        "type": "datetimepicker",
        "placeholder": config.dateFormat,
        "options": { format: config.dateFormat },
        "class": "col-xs-12 col-md-6",
        "validators": {
          callback: {
            message: app.data["Date Open"] + ' is required',
            // this is added to formValidation
            callback: function (value, validator, $field) {
              var checkVal = $("#complaintStatus").val();
              return (checkVal !== config.status.ApprovedHRC) ? true : (value !== '');
            }
          }
        }
      }, {
        "id": "closeDate",
        "title": app.data["Date Closed"],
        "type": "datetimepicker",
        "placeholder": config.dateFormat,
        "options": { format: config.dateFormat },
        "class": "col-xs-12 col-md-6",
        "validators": {
          callback: {
            message: app.data["Date Closed"] + ' is required',
            // this is added to formValidation
            callback: function (value, validator, $field) {
              var checkVal = $("#complaintStatus").val();
              return (checkVal !== config.status.ApprovedHRC) ? true : (value !== '');
            }
          }
        }
      }]
    }, {
      fields: [{
        "id": "caseManager",
        "title": app.data["Case Manager"],
        "required": true,
        "type": "dropdown",
        "choices": config.caseManager.choices,
        "class": "col-xs-12 col-md-4",
        "validators": {
          callback: {
            message: app.data["Case Manager"] + ' is required',
            // this is added to formValidation
            callback: function (value, validator, $field) {
              var checkVal = $("#complaintStatus").val();
              return (checkVal !== config.status.ApprovedHRC) ? true : (value !== '');
            }
          }
        }
      }, {
        "id": "fileNumber",
        "title": app.data["File Number"],
        "class": "col-xs-12 col-md-4"
      }, {
        "id": "paperFile",
        "title": app.data["Paper File"],
        "type": "checkbox",
        "choices": config.paperFile.choices,
        "class": "col-xs-12 col-md-4"
      }]
    }, {
      fields: [{
        "id": "staffNotes",
        "title": app.data["Staff Notes"],
        "type": "textarea",
        "class": "col-xs-12 col-md-12"
      }]
    }, {
      fields: [{
        "id": "outCome",
        "title": app.data["Intervention Outcome"],
        "type": "textarea",
        "class": "col-xs-12 col-md-12"
      }]
    }, {
      fields: [{
        "id": "contactHow", "title": app.data["Contacted By"], "type": "checkbox", "choices": config.contactHow.choices,
        "class": "col-xs-12 col-md-12"
      }]
    }

    ]
  },
  {
    id: "relatedFilesSec",
    title: app.data["Related Files Section"],
    className: "panel-info",
    rows: [
      {
        fields: [{
          "id": "docsIntroStaff", "title": "Staff File Attachments", "type": "html", "aria-label": "Dropzone File Upload Control Field", "html": '<section aria-label="File Upload Control Field" id="staff_attachment"> <div class="dropzone" id="staff_dropzone"></div></section><section id="staff_uploads"></section>'
        }]
      }
      , {
        fields: [
          {
            id: "actionBar",
            type: "html",
            html: `<div className="col-xs-12 col-md-12"><button class="btn btn-success" id="savebtn"><span class="glyphicon glyphicon-send" aria-hidden="true"></span> ` + config.button.submitReport + `</button>
                  </div>`
            //<button class="btn btn-success" id="closebtn"><span class="glyphicon glyphicon-remove-sign" aria-hidden="true"></span>Close</button>
          },
          {
            id: "successFailRow",
            type: "html",
            className: "col-xs-12 col-md-12",
            html: `<div id="successFailArea" className="col-xs-12 col-md-12"></div>`
          }
        ]
      },
      {
        fields: [{
          "id": "fid",
          "type": "html",
          "html": "<input type=\"text\" id=\"fid\" aria-label=\"Document ID\" aria-hidden=\"true\" name=\"fid\">",
          "class": "hidden"
        }, {
          "id": "action",
          "type": "html",
          "html": "<input type=\"text\" id=\"action\" aria-label=\"Action\" aria-hidden=\"true\" name=\"action\">",
          "class": "hidden"
        }, {
          "id": "createdBy",
          "type": "html",
          "html": "<input type=\"text\" id=\"createdBy\" aria-label=\"Complaint Created By\" aria-hidden=\"true\" name=\"createdBy\">",
          "class": "hidden"
        }, {
          "id": "complaintCreated",
          "type": "html",
          "html": "<input type=\"text\" id=\"complaintCreated\" aria-label=\"Complaint Creation Date\" aria-hidden=\"true\" name=\"complaintCreated\">",
          "class": "hidden"
        }, {
          "id": "yearCreated",
          "type": "html",
          "html": "<input type=\"text\" id=\"yearCreated\" aria-label=\"Complaint Creation Year\" aria-hidden=\"true\" name=\"yearCreated\">",
          "class": "hidden"
        }, {
          "id": "modifiedBy",
          "type": "html",
          "html": "<input type=\"hidden\" aria-label=\"Modified By\" aria-hidden=\"true\" id=\"modifiedBy\" name=\"modifiedBy\">",
          "class": "hidden"
        }, {
          "id": "modifiedEmail",
          "type": "html",
          "html": "<input type=\"hidden\" aria-label=\"Modifier Email\" aria-hidden=\"true\" id=\"modifiedEmail\" name=\"modifiedEmail\">",
          "class": "hidden"
        }]
      }
    ]
  }/*,
  {
    id: "contactInfoSec",
    title: app.data["Contact information Section"],
    className: "panel-info",
    rows: [
      {
        fields: [
        ]
      }
    ]
  }*/
  ];// sections
  return sections;
}
/*function getSessionStorage(data) {
  if (checkSessionStorage()) {
    let storedData = sessionStorage.getItem('keyHRC');
    if (storedData != null) {
      data = JSON.parse(storedData);
      sessionStorage.clear();
    }
  }
}
function setSessionStorage(formData) {
  //  let sessionStatus = true;
  if (checkSessionStorage()) {
    sessionStorage.setItem('keyHRC', JSON.stringify(formData));
  }
}
function checkSessionStorage() {
  // let sessionStatus = true;
  if (sessionStatus) {
    if (typeof (Storage) !== "undefined") {
      // Code for localStorage
      return true;
    } else {
      // Sorry! No Web Storage support..
    }
  }
  return false;
}*/
// COT FORM 2

var cot_form2 = function (o) {
  o.rootPath = o.rootPath || '';
  cot_form.call(this, o);
};

cot_form2.prototype = Object.create(cot_form.prototype);
cot_form2.prototype.constructor = cot_form2;

cot_form2.prototype.processGrid = function (oRow, oVal, row) {
  if (row instanceof cot_grid2) {
    var dis = this;

    // GRID 2

    var hGrid = oRow.appendChild(document.createElement('div'));
    hGrid.setAttribute('class', 'grid2');

    var hCounter = hGrid.appendChild(document.createElement('input'));
    hCounter.setAttribute('type', 'hidden');
    hCounter.setAttribute('value', '0');
    hCounter.setAttribute('id', row.id);
    hCounter.setAttribute('name', row.id);
    hCounter.setAttribute('class', 'grid2-counter');

    hCounter.getGrid2 = function () { return hGrid; };

    // HEADER

    var hHeader = hGrid.appendChild(document.createElement('div'));
    hHeader.setAttribute('class', 'grid2-header col-xs-12');

    var hTitle = hHeader.appendChild(document.createElement('h4'));
    hTitle.appendChild(document.createTextNode(row.title));

    // BODY

    var hBody = hGrid.appendChild(document.createElement('div'));
    hBody.setAttribute('class', 'grid2-body');

    var hRow;
    function addRow(oVal) {

      // BODY ITEM

      var hBodyItem = hBody.appendChild(document.createElement('div'));
      hBodyItem.setAttribute('class', 'grid2-bodyItem col-xs-12');

      // DIVIDER

      hRow = hBodyItem.appendChild(document.createElement('div'));
      hRow.setAttribute('class', 'row');

      var hBodyItemDivider = hRow.appendChild(document.createElement('div'));
      hBodyItemDivider.setAttribute('class', 'col-xs-12');

      var hBodyItemDividerHr = hBodyItemDivider.appendChild(document.createElement('hr'));
      hBodyItemDividerHr.style.borderTop = '1px solid #ccc';
      hBodyItemDividerHr.style.marginTop = '0';

      // FIELDS

      hRow = hBodyItem.appendChild(document.createElement('div'));
      hRow.setAttribute('class', 'row');

      $.each(row.fields, function (l, field) {
        if (!field.original_id) field.original_id = field.id;
        var i = parseInt(hCounter.value);
        field.id = row.id + '_' + i + '_' + field.original_id;
        dis.processField(hRow, oVal, row, field);
      });

      // BUTTONS

      hRow = hBodyItem.appendChild(document.createElement('div'));
      hRow.setAttribute('class', 'row');

      var hBodyItemButtons = hRow.appendChild(document.createElement('div'));
      hBodyItemButtons.setAttribute('class', 'grid2-footer col-xs-12 text-right form-group');

      var hRemoveButton = hBodyItemButtons.appendChild(document.createElement('button'));
      hRemoveButton.appendChild(document.createTextNode(row.removeButtonLabel));
      hRemoveButton.setAttribute('class', 'grid2-bodyItemFooterButton btn btn-default');
      hRemoveButton.addEventListener('click', function (e) {
        e.preventDefault();

        var element = this.parentNode.parentNode.parentNode;
        if (element.parentNode.childNodes.length > 1) {
          element.parentNode.removeChild(element);
          finalizeGrid();
        }

      });

      hCounter.value = parseInt(hCounter.value) + 1;
    }

    for (var i = 0; i < row.initQty; i++) {
      addRow(oVal);
    }

    var hAddButton = hRow.childNodes[hRow.childNodes.length - 1].appendChild(document.createElement('button'));
    hAddButton.appendChild(document.createTextNode(row.addButtonLabel));
    hAddButton.setAttribute('class', 'btn btn-default');
    hAddButton.addEventListener('click', function (e) {
      e.preventDefault();
      var oVal = { fields: {} };
      addRow(oVal);

      var arrNewFields = $(hRow).closest('.grid2-bodyItem').find('.form-control');
      $.each(arrNewFields, function (i, item) {
        $('#' + dis.id).formValidation('addField', $(item), oVal.fields[item.name]);
      });
      dis.initializeFunctions();
      finalizeGrid();
    });

    function finalizeGrid() {

      // UPDATE COUNT
      hCounter.setAttribute('value', hBody.childNodes.length);

      // UPDATE NAME
      for (var i = 0; i < hBody.childNodes.length; i++) {
        var namedElements = hBody.childNodes[i].querySelectorAll('[name]');
        for (var i2 = 0; i2 < namedElements.length; i2++) {
          if (!namedElements[i2].getAttribute('data-original-id')) {
            var regexString = row.id + '_\\d+_(.*)';
            var regexMatch = namedElements[i2].getAttribute('id').match(new RegExp(regexString))
            namedElements[i2].setAttribute('data-original-id', regexMatch[1]);
          }
          var newName = row.id + '_' + i + '_' + namedElements[i2].getAttribute('data-original-id');
          if (namedElements[i2].getAttribute('name') != newName) {
            namedElements[i2].setAttribute('name', newName);
          }
          if (namedElements[i2].getAttribute('id') != newName) {
            namedElements[i2].setAttribute('id', newName);
          }
        }
      }

      // MOVE ADD BUTTON
      var hLastBodyItem = hBody.childNodes[hBody.childNodes.length - 1];
      var hLastBodyItemLastElement = hLastBodyItem.querySelectorAll('.grid2-footer')[0];
      if (hAddButton.parentNode != hLastBodyItemLastElement) {
        hLastBodyItemLastElement.appendChild(hAddButton);
      }
    }

    hGrid.setQuantityTo = function (count) {
      while (hBody.childNodes.length < count) {
        $(hAddButton).trigger('click');
      }
    };

  } else {
    cot_form.prototype.processGrid.call(this, oRow, oVal, row);
  }
};

// COT GRID 2

var cot_grid2 = function (o) {
  cot_grid.call(this, o);
  this.addButtonLabel = o.addButtonLabel || 'Add';
  this.removeButtonLabel = o.removeButtonLabel || 'Remove';
  this.initQty = o.initQty || 1;
};

cot_grid2.prototype = Object.create(cot_grid.prototype);
cot_grid2.prototype.constructor = cot_grid2;

function CotForm2(definition) {
  if (!definition) {
    throw new Error('You must supply a form definition');
  }
  this._isRendered = false;
  this._definition = definition;
  this._useBinding = definition['useBinding'] || false;
  this._model = null;
  this.cotForm = new cot_form2({
    id: definition['id'] || 'new_form',
    title: definition['title'],
    success: definition['success'] || function () {
    }
  });
  var that = this;
  var bindableTypes = ['text', 'dropdown', 'textarea', 'checkbox', 'radio'];
  $.each(definition['sections'] || [], function (i, sectionInfo) {
    var section = that.cotForm.addSection({
      id: sectionInfo['id'] || 'section' + i,
      title: sectionInfo['title'],
      className: sectionInfo['className']
    });
    $.each(sectionInfo['rows'] || [], function (y, row) {
      if (row['fields']) {
        row['fields'].forEach(function (field) {
          var type = field['type'] || 'text';
          if (field['bindTo'] && bindableTypes.indexOf(type) === -1) {
            throw new Error('Error in field ' + (field['id'] || 'no id') + ', fields of type ' + type + ' cannot use bindTo.');
          }
        });
        section.addRow(row['fields']);
      } else if (row['grid']) {
        section.addGrid(row['grid']);
      } else if (row['grid2']) {
        section.addGrid(new cot_grid2(row['grid2']));
      }
    });
  });
};

CotForm2.prototype = Object.create(CotForm.prototype);
CotForm2.prototype.constructor = CotForm2;
CotForm.prototype.setData = function (data) {
  // STANDARD FIELD OPERATION
  function standardFieldOp(field, val) {
    if (field.length === 1) { // SINGLE FIELD ELMENT
      if (Array.isArray(val)) { // MULTIPLE VALUE ELEMENT - AKA SELECT
        for (var i = 0, l = val.length; i < l; i++) {
          field.find('[value="' + val[i] + '"]').prop('selected', true);
        }
      } else { // STANDARD TEXT-LIKE FIELD
        if (field.is('[type="checkbox"]') || field.is('[type="radio"]')) { // EXCEPT FOR THIS
          if (field.val() === val) {
            field.prop('checked', true);
          }
        } else {
          field.val(val);
        }
      }
    } else { // MULTIPLE FIELD ELEMENT - GROUP OF CHECKBOXS, RADIO BUTTONS
      if (Array.isArray(val)) {
        for (var i = 0, l = val.length; i < l; i++) {
          field.filter('[value="' + val[i] + '"]').prop('checked', true);
        }
      } else { // SINGLE FIELD ELEMENT - STAND ALONE CHECKBOX, RADIO BUTTON
        field.filter('[value="' + val + '"]').prop('checked', true);
      }
    }
    // PLUGIN REBUILD
    field.filter('.multiselect').multiselect('rebuild');
    field.filter('.daterangevalidation').daterangepicker('update');
  }
  // GO THROUGH DATA
  var form = $('#' + this.cotForm.id);
  for (var k in data) {
    if (k === 'rows') { // GRID FIELDS
      for (var i = 0, l = data[k].length; i < l; i++) {
        if (i > 0) { // ADD ROW IF NEEDED
          var fields = $();
          for (var k2 in data[k][i]) {
            fields = fields.add(form.find('[name="row[0].' + k2 + '"]'));
          }
          fields.closest('tr').find('button.grid-add').trigger('click');
        }

        for (var k2 in data[k][i]) { // ASSIGN VALUES
          standardFieldOp(form.find('[name="row[' + i + '].' + k2 + '"]'), data[k][i][k2]);
        }
      }
    } else { // STANDARD FIELDS
      standardFieldOp(form.find('[name="' + k + '"]'), data[k]);
    }
  }
};