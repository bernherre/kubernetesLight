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


1. Initializes cluster master node:

 kubeadm init --apiserver-advertise-address $(hostname -i) --pod-network-cidr 10.5.0.0/16


 2. Initialize cluster networking:

 kubectl apply -f https://raw.githubusercontent.com/cloudnativelabs/kube-router/master/daemonset/kubeadm-kuberouter.yaml


 3. (Optional) Create an nginx deployment:

 kubectl apply -f https://raw.githubusercontent.com/kubernetes/website/master/content/en/examples/application/nginx-app.yaml

kubectl apply -f dashboard-adminuser.yaml

kbectl -n kubernetes-dashboard create token admin-user

scoop install nano

nano ngix-pod.yaml

kubectl apply -f nginx-pod.yaml

kubectl get pods

kubectl logs nginx

kubectl exec -it nginx -c nginx-container  /bin/bash
