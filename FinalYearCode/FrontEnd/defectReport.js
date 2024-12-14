const file = document.getElementById("fileUploadInput");
const clearFilebtn = document.getElementById("clearFile");
const uploadFileBtn = document.getElementById("uploadFile");
const tableData = document.getElementById("table-data");
const backDrop = document.getElementById("backdrop");
const spinner = document.getElementById("spinner");
const btnSave = document.getElementById("btnSave");
const messageOpenBtn = document.getElementById("messageOpenBtn");
const messageText = document.getElementById("messageText");
const messageTitle = document.getElementById("messageTitle");
const printDiv = document.getElementById("printDiv");
const btnDownload = document.getElementById("btnDownload");
const switchBtn = document.getElementById("switchBtn");
const switchLabel = document.getElementById("switchLabel");
const textUploadInput = document.getElementById("textUploadInput");

const loadingState = new State(false, "loadingState");
const dataState = new State(null, "dataState");
const savedState = new State(null, "savedState");
const errorState = new State(false, "errorState");
const fileOrTextState = new State(true, "fileOrTextState"); //if true => file

clearFilebtn.addEventListener("click", () => {
  file.value = "";
  textUploadInput.value = "";
});

uploadFileBtn.addEventListener("click", () => {
  if (fileOrTextState.getState()) {
    // file
    if (file.files.length > 0) {
      loadingState.setState(true);
      const formData = new FormData();
      formData.append("csv_file", file.files[0]);

      fetch(
        "http://ec2-3-1-83-200.ap-southeast-1.compute.amazonaws.com:1118/defect_level",
        {
          method: "POST",
          body: formData,
        }
      )
        .then((res) => {
          return res.json();
        })
        .then((result) => {
          if(result.error){
            throw new Error('Failed')
          }
          loadingState.setState(false);
          dataState.setState(result);
        })
        .catch(() => {
          errorState.setState(true);
          loadingState.setState(false);
        });
    } else {
      messageText.innerText = "Please select a file !";
      messageTitle.innerText = "Upload defect Report";
      messageOpenBtn.click();
    }
  } else {
    if (textUploadInput.value.length > 0) {
      loadingState.setState(true);

      fetch(
        "http://ec2-3-1-83-200.ap-southeast-1.compute.amazonaws.com:1118/defect_level",
        {
          method: "POST",
          body: JSON.stringify({
            key: textUploadInput.value,
          }),
        }
      )
        .then((res) => {
          return res.json();
        })
        .then((result) => {
          if (result.error) {
            throw new Error("Failed");
          }
          loadingState.setState(false);
          dataState.setState(result);
        })
        .catch(() => {
          loadingState.setState(false);
          errorState.setState(true);
        });
    } else {
      messageText.innerText = "Please Enter Text !";
      messageTitle.innerText = "Upload defect Report";
      messageOpenBtn.click();
    }
  }
});

btnSave.addEventListener("click", () => {
  if (fileOrTextState.getState()) {
    //file
    if (file.files.length > 0) {
      loadingState.setState(true);

      const formData = new FormData();
      formData.append("csv_file", file.files[0]);

      fetch(
        "http://ec2-3-1-83-200.ap-southeast-1.compute.amazonaws.com:1118/save2db",
        {
          method: "POST",
          body: formData,
        }
      )
        .then((res) => {
          return res.json();
        })
        .then((result) => {
          if (result.status === "succesfully updated data") {
            loadingState.setState(false);
            savedState.setState(true);
          } else {
            throw new Error("Save Failed");
          }
        })
        .catch(() => {
          loadingState.setState(false);
          errorState.setState(true);
        });
    } else {
      messageText.innerText = "No data to save!";
      messageOpenBtn.click();
    }
  } else {
    if (file.files.length > 0) {
      loadingState.setState(true);

      fetch(
        "http://ec2-3-1-83-200.ap-southeast-1.compute.amazonaws.com:1118/save2db",
        {
          method: "POST",
          body: JSON.stringify({
            key: textUploadInput.value,
          }),
        }
      )
        .then((res) => {
          return res.json();
        })
        .then((result) => {
          if (result.status === "succesfully updated data") {
            loadingState.setState(false);
            savedState.setState(true);
          } else {
            throw new Error("Save Failed");
          }
        })
        .catch(() => {
          loadingState.setState(false);
          errorState.setState(true);
        });
    } else {
      messageText.innerText = "Please Enter Text !";
      messageOpenBtn.click();
    }
  }
});

btnDownload.addEventListener("click", () => {
  html2pdf().from(printDiv).toPdf().save("results.pdf");
});

// switchBtn.addEventListener("change", () => {
//   fileOrTextState.setState(!fileOrTextState.getState());
// });

loadingState.subscribe((state) => {
  if (state) {
    backDrop.classList.add("backdrop");
    spinner.classList.add("lds-facebook");
  } else {
    backDrop.classList.remove("backdrop");
    spinner.classList.remove("lds-facebook");
  }
});

dataState.subscribe((data) => {
  console.log(data);
  Array.isArray(data) &&
    data.map(
      (predicate) =>
        (tableData.innerHTML =
          tableData.innerHTML +
          `<tr class="text-start fw-bold"><td>${
            predicate.DefectReport
          }</td> <td ${
            predicate.PriorityLevel === "P1" && 'class="text-danger"'
          }  ${predicate.PriorityLevel === "P2" && 'class="text-warning"'} ${
            predicate.PriorityLevel === "P3" && 'class="text-pink"'
          } ${predicate.PriorityLevel === "P4" && 'class="text-primary"'} ${
            predicate.PriorityLevel === "P5" && 'class="text-success"'
          } >${predicate.PriorityLevel}</td></tr>`)
    );
});

savedState.subscribe((state) => {
  if (state) {
    messageTitle.innerText = "Save Defect Reports";
    messageText.innerText = "Saved Sucessfully";
  } else {
    messageTitle.innerText = "Save Defect reports";
    messageText.innerText = "Failed To Save. Try Again !";
  }
  messageOpenBtn.click();
});

fileOrTextState.subscribe((state) => {
  if (state) {
    //file
    switchLabel.innerText = "File";
    textUploadInput.classList.add("d-none");
    file.classList.remove("d-none");
  } else {
    //text
    switchLabel.innerText = "Text";
    textUploadInput.classList.remove("d-none");
    file.classList.add("d-none");
  }
});

errorState.subscribe((eror) => {
  if (eror) {
    messageText.innerText = "Empty File! Please Upload correct file!";
    messageTitle.innerText = "Error";
    messageOpenBtn.click();
  }
});
