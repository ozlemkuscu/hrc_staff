
const app = new cot_app("Human Rights Complaint", {
  hasFooter: true,
  hasContentBottom: true,
  hasContentRight: true,
  hasContentLeft: true,
  hasContentTop: true,
  hasLeftNav: false,
  searchcontext: 'INTRA'
});
let httpHost;
let oLogin;
//let groupMemberships = ['testweb1','G', 'R', 'M', 'Administrator', 'human_rights_user', 'human_rights_admin'];
// let groupMemberships = ['testweb1', 'human_rights_user', 'human_rights_admin'];
let groupMemberships = [];

let tab = "Yes";
let form_id = "human_rights_form";
let config;
$(document).ready(function () {
  loadVariables();
});

function loadVariables() {
  $.ajax({
    url: "//www1.toronto.ca/static_files/WebApps/CommonComponents/Human_Rights/JSONFeed.js",
    type: "GET",
    cache: "true",
    dataType: "jsonp",
    jsonpCallback: "callback",
    success: function (data) {
      $.each(data.items, function (i, item) { app.data[item.title] = item.summary; });
      config = app.data.config;
      renderCFrame();
    },
    error: function () {
      alert("Error: The application was unable to load data.")
    }
  });
}
function renderCFrame() {
  //ADD ALL THE LINKS YOU WANT TO THE APPLICATION BREADCRUMB
  httpHost = detectHost();
  app.setBreadcrumb(app.data["breadcrumbtrail"]);
  //INCLUDE ANY NECCESSARY JS/CSS LIBRARIES
  //FORMS TYPICALLY USE AT LEAST THE FOLLOWING 3 LIBRARIES
  app.includeLogin = app.includeDatePicker = app.includeRangePicker = app.includeFormValidation = app.includePlaceholders = app.includeMultiSelect = true;
  app.searchContext = "INTRA";
  //RENDER THE FINISHED PAGE AND THEN CALL A CALLBACK FUNCTION WHEN COMPLETE
  app.render(init);
}
function detectHost() {
  switch (window.location.origin) {
    case config.httpHost.root.dev:
      return 'dev';
    case config.httpHost.root.qa:
      return 'qa';
    case config.httpHost.root.prod:
      return 'prod';
    default:
      //  console.log("Cannot find the server parameter in detectHost function. Please check with your administrator.");
      return 'dev';
  }
}
// Page authorization based on user cookie and group permissions
function auth() {
  if (!oLogin.isLoggedIn()) {
    //  console.log("user not logged in");
    $("#app-content-top").empty().html(config.auth.login);
    $("#view_pane").empty();
    $("#app-content-right").show();
    //oLogin.setUserName();
    scroll(0, 0);
    return false;
  } else if (groupMemberships.length < 1) {
    $("#app-content-top").empty().html(config.auth.group);
    $("#view_pane").empty();
    $("#app-content-right").show();
    scroll(0, 0);
    return false;
  } else {

    if (oLogin.sid) {
      // check if the session is still active
      var sessionCheckValid;
      sessionCheck(function (textStatus, data) {
        // success
        $("#app-content-right").hide();
        sessionCheckValid = true;
      }, function (textStatus, errorThrown) {
        // failure
        $("#app-content-top").empty().html(config.auth.login);
        $("#view_pane").empty();
        $("#app-content-right").show();
        scroll(0, 0);
        sessionCheckValid = false;
      })
      return sessionCheckValid;
    } else {
      $("#app-content-top").empty().html(config.auth.login);
      $("#view_pane").empty();
      $("#app-content-right").show();
      scroll(0, 0);
      return false;
    }
  }
}
function sessionCheck(success, failed) {
  // to check if the session is still active
  $.ajax({
    url: config.httpHost.app[httpHost] + config.api.session + getCookie('human_rights.sid'),
    dataType: 'json',
    async: false,
    error: function (jqXHR, textStatus, errorThrown) {
      failed(textStatus, errorThrown);
    },
    method: 'GET',
    success: function (data, textStatus) { //, jqXHR) {
      if (data.error) { // if (data.error == 'no_such_session')
        failed('Error', data.error);
      } else {
        success(textStatus, data);
      }
    }
  }
  )
}
// Render mustache.js template
function tpl(id, mst, callback) {
  $.get(mst, function (template) {
    let rendered = Mustache.render(template, $.extend(config, cot_login_app));
    $(id).empty().html(rendered);
    callback();
  }).fail(function () {
    $(id).empty();
    console.log('Failed to load template:  ' + mst);
  });
}
function listSubmissions(status, filter, repo, target) {
  let customView = "";
  if (status == "AllByCaseManager") {
    customView = "ByCaseManager";
    status = "All";
  }

  //verify user still has a session
  if (auth()) {
    app.setContent({ bottom: '<div class="row"><div class="col-xs-12"><div id="view_pane" class="">viewPane</div></div></div>' });

    //Update View Title

    let viewParam = "";
    let viewParam2 = "";
    if (customView == "ByCaseManager") {
      viewParam = config.status[status];
      viewParam2 = "By Case Manager";
    } else if (status == "All") {
      viewParam = config.status[status];
    } else if (status == "Yes" || status == "Submitted" || status == "Approved") {
      viewParam = config.status[status + 'HRC'];
    } else if (status == "Search") {
      viewParam = "Result";
    }

    $("#viewtitle").html(viewParam + " Submissions " + viewParam2);

    // build retrieve parameters
    let json = {};
    json.repo = repo;
    json.status = status == "Search" ? "" : (status == "All" ? "" : status);
    json.filter = (status == "All" ? "status~(Yes)|(Submitted)|(Approved)" : filter);

    let args = "";

    //initialize new cc_retrieve_view (pass in constructor)
    if (customView == "ByCaseManager") {
      // build cc_retrieve_view constructor

      args = {
        url: config.httpHost.app[httpHost] + config.api.get + repo + '/?json=' + JSON.stringify(json) + '&sid=' + getCookie('human_rights.sid'),
        target: $("#" + target),
        addScroll: true,
        addFilter: true,
        defaultSortOrder: "des",
        addFooter: true,
        // dateFormat: 'YYYY/MM/DD h:mm:ss a'
        dateFormat: config.dateTimeFormat,
        columnDefs: [
          { "targets": 0, data: null, title: '<span class="sr-only">' + app.data["View_Edit"] + '</span>', "defaultContent": `<a class="btn-default btn-view-edit-report"><span  title="View/Edit" class="glyphicon glyphicon-pencil"></span></a>` },
          { "targets": 1, data: 'caseManager', "title": app.data["Case Manager"], defaultContent: '', sortOrder: "des" },
          { "targets": 2, data: function (row, type, val, meta) { return (row.firstName + " " + row.lastName); }, defaultContent: '', title: app.data["Name"] },
          { "targets": 3, data: 'actionList', "title": app.data["Action List"], defaultContent: '', sortOrder: "des" },
          { "targets": 4, data: 'ground', "title": app.data["Ground"], defaultContent: 'Other', sortOrder: "des" },
          { "targets": 5, data: 'typeComplaint', title: app.data["Type of Complaint"], defaultContent: '', sortOrder: "des" },
          { "targets": 6, data: 'divisionComplaint', "title": app.data["CityDivision"], defaultContent: '', sortOrder: "des" },
          { "targets": 7, data: 'issue', title: app.data["Issue"], defaultContent: '' }
        ],
      };

    } else if (status == "All") {
      // build cc_retrieve_view constructor
      args = {
        url: config.httpHost.app[httpHost] + config.api.get + repo + '/?json=' + JSON.stringify(json) + '&sid=' + getCookie('human_rights.sid'),
        target: $("#" + target),
        addScroll: true,
        addFilter: true,
        defaultSortOrder: "des",
        addFooter: true,
        dateFormat: config.dateTimeFormat,
        columnDefs: [
          { "targets": 0, data: null, title: '<span class="sr-only">' + app.data["View_Edit"] + '</span>', "defaultContent": `<a class="btn-default btn-view-edit-report"><span title="View/Edit" class="glyphicon glyphicon-pencil"></span></a>` },
          {
            "targets": 1, defaultContent: "", "title": app.data["Open Year"],
            data: function (row, type, val, meta) {
              if (row.openDate != "") {
                var yearVar = new Date(row.openDate).getFullYear();
                if (!isNaN(yearVar)) {
                  return yearVar;
                }
              }
              return "";
            }
          },
          {
            "targets": 2, defaultContent: "", "title": app.data["Open Month"],
            data: function (row, type, val, meta) {
              if (row.openDate != "") {
                var monthVar = new Date(row.openDate).getMonth();
                if (!isNaN(monthVar)) {
                  return monthVar + 1;
                }
              }
              return "";
            }
          },
          { "targets": 3, data: function (row, type, val, meta) { return (row.firstName + " " + row.lastName); }, defaultContent: '', title: app.data["Name"] },
          { "targets": 4, data: 'actionList', "title": app.data["Action List"], defaultContent: '', sortOrder: "des" },
          { "targets": 5, data: 'ground', "title": app.data["Ground"], defaultContent: 'Other', sortOrder: "des" },
          { "targets": 6, data: 'typeComplaint', title: app.data["Type of Complaint"], defaultContent: '', sortOrder: "des" },
          { "targets": 7, data: 'divisionComplaint', "title": app.data["CityDivision"], defaultContent: '', sortOrder: "des" },
          { "targets": 8, data: 'issue', title: app.data["Issue"], defaultContent: '' },
          { "targets": 9, data: 'caseManager', "title": app.data["Case Manager"], defaultContent: '', sortOrder: "des" },
          {
            "targets": 10, defaultContent: '', title: app.data["AddContactName1"],
            data: function (row, type, val, meta) {
              return (row.grid_0_addfirstName == null ? '' : row.grid_0_addfirstName + ' ') + (row.grid_0_addlastName == null ? '' : row.grid_0_addlastName);
            }
          },
          {
            "targets": 11, defaultContent: '', title: app.data["AddContactName2"],
            data: function (row, type, val, meta) {
              return (row.grid_1_addfirstName == null ? '' : row.grid_1_addfirstName + ' ') + (row.grid_1_addlastName == null ? '' : row.grid_1_addlastName);
            }
          },
          {
            "targets": 12, defaultContent: '', title: app.data["AddContactName3"],
            data: function (row, type, val, meta) {
              return (row.grid_2_addfirstName == null ? '' : row.grid_2_addfirstName + ' ') + (row.grid_2_addlastName == null ? '' : row.grid_2_addlastName);
            }
          },
        ]
      };

    }
    else if (viewParam == config.status.YesHRC) {
      // build cc_retrieve_view constructor
      args = {
        url: config.httpHost.app[httpHost] + config.api.get + repo + '/?json=' + JSON.stringify(json) + '&sid=' + getCookie('human_rights.sid'),
        target: $("#" + target),
        addScroll: true,
        addFilter: true,
        defaultSortOrder: "des",
        addFooter: true,
        dateFormat: config.dateTimeFormat,
        columnDefs: [
          { "targets": 0, data: null, defaultContent: '', title: '<span class="sr-only">' + app.data["View_Edit"] + '</span>', "defaultContent": `<a class="btn-default btn-view-edit-report"><span title="View/Edit" class="glyphicon glyphicon-pencil"></span></a>` },
          {
            "targets": 1, defaultContent: '', title: app.data["Submission Date Column"], type: 'date',
            data: function (row, type, val, meta) {
              if (row.complaintCreated != "") {
                return moment(new Date(row.complaintCreated)).format(config.dateTimeFormat);
              }
              return moment(row.created).format(config.dateTimeFormat);
            }
          },
          { "targets": 2, data: function (row, type, val, meta) { return (row.firstName + " " + row.lastName); }, defaultContent: '', title: app.data["Name"] },
          { "targets": 3, data: 'actionList', "title": app.data["Action List"], defaultContent: '', sortOrder: "des" },
          { "targets": 4, data: 'ground', "title": app.data["Ground"], defaultContent: 'Other', sortOrder: "des" },
          { "targets": 5, data: 'typeComplaint', title: app.data["Type of Complaint"], defaultContent: '', sortOrder: "des" },
          { "targets": 6, data: 'divisionComplaint', "title": app.data["CityDivision"], defaultContent: '', sortOrder: "des" },
          { "targets": 7, data: 'issue', title: app.data["Issue"], defaultContent: '' },
          { "targets": 8, data: 'caseManager', "title": app.data["Case Manager"], defaultContent: '', sortOrder: "des" }
        ]
      }
    } else {
      // build cc_retrieve_view constructor
      args = {
        url: config.httpHost.app[httpHost] + config.api.get + repo + '/?json=' + JSON.stringify(json) + '&sid=' + getCookie('human_rights.sid'),
        target: $("#" + target),
        addScroll: true,
        addFilter: true,
        defaultSortOrder: "des",
        addFooter: true,
        dateFormat: config.dateTimeFormat,
        columnDefs: [
          { "targets": 0, data: null, defaultContent: '', title: '<span class="sr-only">' + app.data["View_Edit"] + '</span>', "defaultContent": `<a class="btn-default btn-view-edit-report"><span title="View/Edit" class="glyphicon glyphicon-pencil"></span></a>` },
          { "targets": 1, data: function (row, type, val, meta) { return (row.firstName + " " + row.lastName); }, defaultContent: '', title: app.data["Name"] },
          { "targets": 2, data: 'actionList', "title": app.data["Action List"], defaultContent: '', sortOrder: "des" },
          { "targets": 3, data: 'ground', "title": app.data["Ground"], defaultContent: 'Other', sortOrder: "des" },
          { "targets": 4, data: 'typeComplaint', title: app.data["Type of Complaint"], defaultContent: '', sortOrder: "des" },
          { "targets": 5, data: 'divisionComplaint', "title": app.data["CityDivision"], defaultContent: '', sortOrder: "des" },
          { "targets": 6, data: 'issue', title: app.data["Issue"], defaultContent: '' },
          { "targets": 7, data: 'caseManager', "title": app.data["Case Manager"], defaultContent: '', sortOrder: "des" }
        ]
      }
    }
 
    var myDataTable = new cc_retrieve_view(args);
    
    //render cc_retrieve_view
    
    myDataTable.render();
    
    $('.dataTables_filter').hide();
    $("#admin_search").on("keyup search input paste cut", function () {
      myDataTable.dt.search(this.value).draw();
    });

    var originalIncrease = window.increaseFontSize;
    window.increaseFontSize = function () {
      originalIncrease();
      myDataTable.dt.draw();
    }

    var originalDecrease = window.decreaseFontSize;
    window.decreaseFontSize = function () {
      originalDecrease();
      myDataTable.dt.draw();
    }

    $('ul.dropdown-menu > li').removeClass('active');
    $('#tabExportCSV').click(function () { $(".dt-button.buttons-csv.buttons-html5").click(); });
    $('#tabExportEXCEL').click(function () { $(".dt-button.buttons-excel.buttons-html5").click(); });
    $('#tabExportPDF').click(function () { $(".dt-button.buttons-pdf.buttons-html5").click(); });
    $('#tabExportCOPY').click(function () { $(".dt-button.buttons-copy.buttons-html5").click(); });
  }
}
function deleteReport(fid, payload, modal, repo) {
  $(".btn").prop('disabled', true);

  $.ajax({
    url: config.httpHost.app[httpHost] + config.api.delete + repo + '/' + fid,
    type: 'GET',
    data: {
      'json': payload,
      'sid': getCookie('human_rights.sid')
    },
    headers: {
      'Content-Type': 'application/json; charset=utf-8;',
      'Cache-Control': 'no-cache'
    },
    dataType: 'json'
  }).done(function () {
    hasher.setHash('?alert=success&msg=delete.done&status=' + tab + '&ts=' + new Date().getTime());
  }).fail(function () {
    hasher.setHash('?alert=danger&msg=delete.fail&status=' + tab + '&ts=' + new Date().getTime());
  }).always(function () {
    modal.modal('hide');
    $(".btn").removeAttr('disabled').removeClass('disabled');
  });
}
function frontPage(query, repo) {
  if (auth()) {
    if (query && query.alert && query.msg) {
      config.messages.current = eval('config.messages.' + query.msg);
    } else {
      config.messages.current = '';
    }

    // Initial application load
    tpl('#app-content-top', 'html/submissions.html', function () {

      if (query && query.alert && query.msg) {
        if (query.alert === 'success') {
          $("#submissions > .alert-success").removeClass('hidden').fadeOut(config.messages.fadeOutTime, function () {
            $(this).addClass('hidden');
            config.messages.current = '';
          });
        } else if (query.alert === 'danger') {
          $("#submissions > .alert-danger").removeClass('hidden').fadeOut(config.messages.fadeOutTime, function () {
            $(this).addClass('hidden');
            config.messages.current = '';
          });
        }
      }

      /* List submissions */
      let tab = (query && query.status) ? query.status : (query ? (query.status == "" ? "Search" : config.status.Draft) : config.status.Draft);
      let _repo = repo ? repo : config.default_repo;
      var search = query && query.search ? query.search : '';

      $('ul.dropdown-menu > li').removeClass('active');
      $('[data-id="' + tab + '"]').parent().addClass('active');

      listSubmissions(tab, search, _repo, 'view_pane');
    });
  }
}
function newPage(query) {
  if (auth()) {
    if (query && query.alert && query.msg) {
      config.messages.current = eval('config.messages.' + query.msg);
    } else {
      config.messages.current = '';
    }

    tpl('#app-content-top', 'html/viewedit.html', function () {
      if (query && query.alert && query.msg) {
        if (query.alert === 'success') {
          $("#new-content > .alert-success").removeClass('hidden').fadeOut(config.messages.fadeOutTime, function () {
            $(this).addClass('hidden');
            config.messages.current = '';
          });
        } else if (query.alert === 'danger') {
          $("#new-content > .alert-danger").removeClass('hidden').fadeOut(config.messages.fadeOutTime, function () {
            $(this).addClass('hidden');
            config.messages.current = '';
          });
        }
      }
      $("#viewtitle").html('Submission' + config.timeOutMsg);
      loadForm("#new-form", null, null, null, form_id, 'human_rights');
    });
  }
}
function viewEditPage(id, query) {
  let repo = query.repo ? query.repo : config.default_repo;
  let docMode = query.mode ? query.mode : "";

  if (auth()) {
    if (query && query.alert && query.msg) {
      config.messages.current = eval('config.messages.' + query.msg);
    } else {
      config.messages.current = '';
    }

    tpl('#app-content-top', 'html/viewedit.html', function () {
      if (query && query.alert && query.msg) {
        if (query.alert === 'success') {
          $("#viewedit-content > .alert-success").removeClass('hidden').fadeOut(config.messages.fadeOutTime, function () {
            $(this).addClass('hidden');
            config.messages.current = '';
          });
        } else if (query.alert === 'danger') {
          $("#viewedit-content > .alert-danger").removeClass('hidden').fadeOut(config.messages.fadeOutTime, function () {
            $(this).addClass('hidden');
            config.messages.current = '';
          });
        }
      }

      // API call to get report
      $.getJSON(config.httpHost.app[httpHost] + config.api.get + repo + '/' + id + '?sid=' + getCookie('human_rights.sid'))
        .done(function (data) {
          let payload = JSON.parse(data.payload);
          //    $("#viewtitle").html((data.status === 'Yes' ? 'Draft' : config.status[data.status + 'HRC']) + ' Report: ' + payload.firstName + " " + payload.lastName);
          $("#viewtitle").html((data.status === 'Yes' ? 'New' : config.status[data.status + 'HRC']) + ' Submission: ' + payload.firstName + " " + payload.lastName + config.timeOutMsg);
          loadForm("#viewedit-form", payload, id, data.status, form_id, 'human_rights', data, docMode);
        })
        .fail(function (textStatus, error) {
          $("#viewedit-content > .alert-danger").append(textStatus + ' ' + error + ' ' + config.messages.load.fail).removeClass('hidden').fadeOut(config.messages.fadeOutTime, function () {
            $(this).addClass('hidden');
          });
        });
    });
  }
}
// Setup hasher
function parseHash(newHash) {
  crossroads.parse(newHash);
}
function initFrontPage(data) {
  // configuration fields, should be same as access configuration values
  let cfg_groupMemberships = config.members.hrc_admin;

  if (cfg_groupMemberships.length > 0) {
    $.each(cfg_groupMemberships, function (i, group) {
      // check if the logged in username is also in groups list
      // if so put it in the groupmemberships values
      if (group === oLogin.username) {
        groupMemberships.push(oLogin.username);
      }
    })

    // check if the user is in one of the application groups
    // values taken from user cookie
    let groupsStr = oLogin.groups;
    // Save group names based on user's group permissions
    if (data && (groupsStr !="")) {
      for (let name in cfg_groupMemberships) {
        if (groupsStr.indexOf(cfg_groupMemberships[name]) !== -1) {
          groupMemberships.push(cfg_groupMemberships[name]);
        }
      }

      hasher.initialized.add(parseHash); // Parse initial hash
      hasher.changed.add(parseHash); // Parse hash changes
      hasher.init(); // Start listening for history change
    }
  }
}
function initFrontPagePrev(data) {
  // configuration fields, should be same as access configuration values
  let cfg_groupMemberships = config.members.hrc_admin.split(',');
  $.each(cfg_groupMemberships, function (i, group) {
    // check if the logged in username is also in groups list
    // if so put it in the groupmemberships values
    if (group === oLogin.username) {
      groupMemberships.push(oLogin.username);
    }
  })

  // check if the user is in one of the application groups
  // values taken from user cookie
  let groupsStr = oLogin.groups;
  let groupsIndexO = groupsStr.indexOf('o=');
  let groupsArray = null;
  if (groupsIndexO > -1) {
    let groups = groupsStr.substring(groupsIndexO + 2);
    groupsArray = groups.split(',');
  }

  // Save group names based on user's group permissions
  if (data && groupsArray) {
    for (let name in cfg_groupMemberships) {
      if (groupsArray.indexOf(cfg_groupMemberships[name]) !== -1) {
        groupMemberships.push(cfg_groupMemberships[name]);
      }
    }

    hasher.initialized.add(parseHash); // Parse initial hash
    hasher.changed.add(parseHash); // Parse hash changes
    hasher.init(); // Start listening for history change
  }
}
function init() {
  crossroads.ignoreState = true;
  crossroads.addRoute('/:?query:', frontPage);
  crossroads.addRoute('/new:?query:', newPage);
  crossroads.addRoute('/{id}:?query:', viewEditPage);

  oLogin = new cot_login({ ccRoot: config.httpHost.app[httpHost], welcomeSelector: "#app-content-right", onLogin: initFrontPage, appName: "human_rights" });

  // Render modal template
  tpl('#app-utility-modal', 'html/modal.html', function () {

    $(".btn-create-report").on('click', function () {
      if (auth()) {
        var modal = $(this);
        createReport(modal);
      }
    });
  });

  // Create New Entry button
  $("#maincontent").on('click', '#btn-createReport', function () {
    if (auth()) {
      hasher.setHash('new?ts=' + new Date().getTime());
    }
  });

  // View Submissions button
  $("#maincontent").on('click', '#btn-viewSubmissions', function () {
    hasher.setHash('?status=' + tab + '&ts=' + new Date().getTime());
  });

  // Print button
  $("#maincontent").on('click', '#btn-print', function () {
    window.print();
  });

  // Export to CSV button
  $("#maincontent").on('click', '#btn-exportCsv', function () { });

  // Navigation tab links by report status
  $("#maincontent").on('click', '.tablink', function () {
    hasher.setHash('?status=' + $(this).attr('data-id') + '&ts=' + new Date().getTime());
  });

  $("#maincontent").on('click', '#btn-adminSearch', function () {
    var query = $('#admin_search').val();
    if (query.trim() != "") {
      //   query = encodeURIComponent('(?i)'+query+'(?-i)');
      hasher.setHash('?status=' + $(this).attr('data-id') + '&search=' + 'payload~' + query + '&ts=' + new Date().getTime());
    }
  });

  // View / Edit report button
  $("#maincontent").on('click', '.btn-view-edit-report', function () {
    hasher.setHash($(this).parents('tr').attr('data-id') + '?ts=' + new Date().getTime() + '&mode=read&repo=human_rights');
  });


  // Set action parameter value based on button clicked
  $("#maincontent").on("click", ".btn-save, .btn-notify, .btn-submit, .btn-approve, .btn-reject", function () {
    $("#action").val($(this).attr('id'));
  });



  $(window).scroll(function () {
    if ($(this).scrollTop() > 50) {
      $("#back-to-top").fadeIn();
    } else {
      $("#back-to-top").fadeOut();
    }
  });

  // Scroll to top
  $("#back-to-top").click(function () {
    $("#back-to-top").tooltip('hide');
    $("html, body").animate({
      scrollTop: 0
    }, 'fast');
    return false;
  });

  $("#back-to-top").tooltip('show');
}
function newReport(query) {
  if (auth()) {
    if (query && query.alert && query.msg) {
      config.messages.current = eval('config.messages.' + query.msg);
    } else {
      config.messages.current = '';
    }

    tpl('#app-content-bottom', 'newReport.html', function () {
      if (query && query.alert && query.msg) {
        if (query.alert === 'success') {
          $("#new-content > .alert-success").removeClass('hidden').fadeOut(config.messages.fadeOutTime, function () {
            $(this).addClass('hidden');
            config.messages.current = '';
          });
        } else if (query.alert === 'danger') {
          $("#new-content > .alert-danger").removeClass('hidden').fadeOut(config.messages.fadeOutTime, function () {
            $(this).addClass('hidden');
            config.messages.current = '';
          });
        }
      }
      // loadForm("#new-form");
      loadReportSearch("#new-form");
    });
  }
}
function createReport(modal) {
  if (auth()) {
    $(".btn-cancel").trigger("click");
    var reportType = $("#reportType").val();
    var searchYear = $("#reportYear").val();

    if (searchYear !== "") {
      var submissionsHTML = '';
      var json = {};
      var tabVal = "All";

      json.repo = 'human_rights';
      //   json.status = 'Approved';
      json.filter = "status~(Yes)|(Submitted)|(Approved)";

      //  json.filter = [{"'Ongoing":"Ongoing"},{'Yes':'Yes'}, {'Closed':'Closed'}];

      $("#viewtitle").text(searchYear + " " + reportType);

      // Building Search results
      submissionsHTML = '<div class="table-responsive"><table class="table table-striped table-bordered table-' + tab + '">';

      $.getJSON(config.httpHost.app[httpHost] + config.api.get + json.repo + '?json=' + JSON.stringify(json) + '&sid=' + getCookie('human_rights.sid'), function (data) {
        sortSubmissionsByDate(data);
        var repSecTitle = "";
        var repSecChoices = "";
        var repSecFieldName = "";

        if (reportType != "") {
          switch (reportType) {
            case config.reportType.choices[0].value:
              // COMPLAINTS REPORT PARAMETERS
              var repSecTitle = ["By Status", "By Issue", "By Employee Type", "By Application"];
              var repSecChoices = [[config.complaintStatus.choices], [config.issue.choices, config.issuePrevVer.choices], [config.cotEmployeeTypeList.choices], [config.complaintType.choices]];
              var repSecFieldName = ["complaintStatus", "issue", "cotEmployeeType", "typeComplaint"];
              break;
            case config.reportType.choices[1].value:
              // ISSUES REPORT PARAMETERS
              var repSecTitle = ["By Grounds"];
              var repSecChoices = [[config.groundAll.choices]];
              var repSecFieldName = ["ground"];
              break;
            case config.reportType.choices[2].value:
              // ACTION REPORT PARAMETERS
              var repSecTitle = ["By Enquiry Type", "By Consultation Type", "By Intervention Type", "By Action Type"];
              ///     var repSecChoices = [[config.enquiryList.choices, config.enquiryListPrevVer.choices], [config.consultationList.choices, config.consultationListPrevVer.choices], [config.interventionList.choices], [config.actionList.choices, config.actionListPrevVer.choices]];
              var repSecChoices = [[config.enquiryList.choices], [config.consultationList.choices], [config.interventionList.choices], [config.actionList.choices]];
              var repSecFieldName = ["enquiryList", "consultationList", "interventionList", "actionList"];
              break;
          }
          let k;
          for (k = 0; k < repSecTitle.length; k++) {
            submissionsHTML = submissionsHTML + createRepSection(data, searchYear, repSecTitle[k], repSecChoices[k], repSecFieldName[k]) + "<tr><td></td><td></td></tr>";
          }
        }
        if (submissionsHTML) {
          $("#view_pane").empty().html(submissionsHTML);
        } else {

          $(".loading img").replaceWith(config.messages.noSubmissionsFound);
        }

      });
    }

    $(".btn").prop('disabled', true);
    modal.modal('hide');
    $(".btn").removeAttr('disabled').removeClass('disabled');
  }
}
function createRepSection(data, searchYear, repSecTitle, repSecChoices, repSecFieldName) {
  if (auth()) {
    let submissionsHTML = "";
    let i, j;
    if (repSecTitle != "") {
      submissionsHTML = '<tr><td><strong>' + repSecTitle + '</strong></td><td><strong>' + "Total Complaints" + '</strong></td>';
    }
    var keyVals = new Array();
    // Gets key parameters
    for (j = 0; j < repSecChoices.length; j++) {
      for (i = 0; i < repSecChoices[j].length; i++) {
        if (repSecChoices[j][i].value != "") {
          keyVals.push(repSecChoices[j][i].value);
        }
      }
    }
    keyVals.push("Total");
    var keyCounters = getCounts(data, searchYear, repSecFieldName, keyVals);
    // Gets the totals
    for (i = 0; i < keyVals.length; i++) {
      submissionsHTML += '<tr><td>' + keyVals[i] + '</td><td>' + keyCounters[i] + '</td></tr>';
    }
    return submissionsHTML;
  }
}
function getCounts(data, searchYear, fieldName, fieldValue) {
  let i, j;
  var counter = new Array();
  for (i = 0; i < fieldValue.length; i++) {
    counter.push(0)
  }

  // Generate HTML for each table row entry
  $.each(data, function (i, row) {

    var payload = JSON.parse(row.payload);
    //   fieldName
    for (j = 0; j < fieldValue.length - 1; j++) {
      //  var complaintCreated = payload["complaintCreated"];
      var complaintCreated = payload["complaintCreated"] ? payload["complaintCreated"] : row.created;
      if (searchYear === "All" || (complaintCreated != undefined && complaintCreated.indexOf(searchYear) > -1)) {
        if (((Array.isArray(payload[fieldName]) && (payload[fieldName].indexOf(fieldValue[j])) > -1))) {
          counter[j] = counter[j] + 1;
          counter[fieldValue.length - 1] = counter[fieldValue.length - 1] + 1;
        } else if (payload[fieldName] === fieldValue[j]) {
          counter[j] = counter[j] + 1;
          counter[fieldValue.length - 1] = counter[fieldValue.length - 1] + 1;
        }
      }
    }

  })
  return counter;
}
// Sort submissions in order of last modified date with most recent first
function sortSubmissionsByDate(data) {
  data.sort(function (a, b) {
    //    return new Date(b.updated).getTime() - new Date(a.updated).getTime();
    return new Date(b.created).getTime() - new Date(a.created).getTime();
  });
}

