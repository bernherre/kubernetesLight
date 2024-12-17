###Util commands


curl.exe -LO "https://dl.k8s.io/v1.32.0/bin/windows/amd64/kubectl.exe.sha256"

CertUtil -hashfile kubectl.exe SHA256

type kubectl.exe.sha256

$(Get-FileHash -Algorithm SHA256 .\kubectl.exe).Hash -eq $(Get-Content .\kubectl.exe.sha256)

kubectl version --client --output=yaml

kubectl completion powershell | Out-String | Invoke-Expression

kubectl version --client

kubectl cluster-info

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

scoop install kubectl

scoop install helm 

helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/

helm upgrade --install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard --create-namespace --namespace kubernetes-dashboard

kubectl get nodes -v 6

ren dashboard-adminuser.yaml.txt dashboard-adminuser.yaml

kubectl apply -f dashboard-adminuser.yaml


curl.exe -LO "https://dl.k8s.io/release/v1.32.0/bin/windows/amd64/kubectl.exe"

